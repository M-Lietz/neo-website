/**
 * Three.js animated background — Cinematic HDR orbs
 * Post-processing: Bloom + Depth of Field
 * PBR: MeshPhysicalMaterial + Environment Map reflections
 * Atmosphere: volumetric fog sprites + deep starfield
 */
import * as THREE from 'three'

/* Fresnel glow shader — bright at sphere surface, fading outward */
const glowVS = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const glowFS = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float NdV = max(dot(vNormal, vViewDir), 0.0);
    float glow = pow(NdV, 1.6) * uIntensity;
    gl_FragColor = vec4(uColor, glow);
  }
`

/* Generate a procedural environment map for reflections */
function createEnvMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  // Gradient sky dome
  const skyGeo = new THREE.SphereGeometry(80, 32, 32)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1828) },
      bottomColor: { value: new THREE.Color(0x1a3050) },
      midColor: { value: new THREE.Color(0x0e2040) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 midColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 col = mix(bottomColor, midColor, smoothstep(-1.0, 0.0, h));
        col = mix(col, topColor, smoothstep(0.0, 1.0, h));
        // Subtle bright spots for fake area lights
        float spot1 = pow(max(dot(normalize(vWorldPos), normalize(vec3(60.0, 45.0, 35.0))), 0.0), 64.0);
        float spot2 = pow(max(dot(normalize(vWorldPos), normalize(vec3(-40.0, 20.0, -30.0))), 0.0), 32.0);
        col += vec3(0.15, 0.2, 0.3) * spot1;
        col += vec3(0.05, 0.08, 0.12) * spot2;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
  envScene.add(new THREE.Mesh(skyGeo, skyMat))
  const envMap = pmrem.fromScene(envScene, 0, 0.1, 200).texture
  pmrem.dispose()
  return envMap
}

export function initBackground(bgCanvas: HTMLCanvasElement, fgCanvas: HTMLCanvasElement) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300)
  camera.position.set(0, 0, 45)

  /* ── Background Renderer — behind HTML ── */
  const bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, antialias: true, powerPreference: 'high-performance' })
  bgRenderer.setClearColor(0x081020, 1)
  bgRenderer.setSize(innerWidth, innerHeight)
  bgRenderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  bgRenderer.toneMapping = THREE.ACESFilmicToneMapping
  bgRenderer.toneMappingExposure = 1.2
  bgRenderer.outputColorSpace = THREE.SRGBColorSpace

  /* ── Foreground Renderer — above HTML, transparent background ── */
  const fgRenderer = new THREE.WebGLRenderer({ canvas: fgCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  fgRenderer.setClearColor(0x000000, 0) // fully transparent
  fgRenderer.setSize(innerWidth, innerHeight)
  fgRenderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  fgRenderer.toneMapping = THREE.ACESFilmicToneMapping
  fgRenderer.toneMappingExposure = 1.2
  fgRenderer.outputColorSpace = THREE.SRGBColorSpace

  /* ── Depth fog — distant objects fade into darkness ── */
  scene.fog = new THREE.FogExp2(0x060e1a, 0.008)

  /* ── Environment map for reflections (per-material only) ── */
  const envMap = createEnvMap(bgRenderer)

  /* ── Lighting — multi-source for ultra-soft shadows ── */
  // Key light — upper right
  const keyLight = new THREE.DirectionalLight(0xeef4ff, 1.6)
  keyLight.position.set(60, 45, 35)
  keyLight.layers.enableAll()
  scene.add(keyLight)

  // Fill light — soft from lower-left (kills hard terminator)
  const fillLight = new THREE.DirectionalLight(0x4a6a8a, 0.5)
  fillLight.position.set(-40, -20, 25)
  fillLight.layers.enableAll()
  scene.add(fillLight)

  // Rim/back light — edge definition from behind
  const rimLight = new THREE.DirectionalLight(0x6090c0, 0.5)
  rimLight.position.set(-10, 30, -40)
  rimLight.layers.enableAll()
  scene.add(rimLight)

  // Hemisphere — sky/ground gradient fill
  const hemiLight = new THREE.HemisphereLight(0x4a7aaa, 0x0a1520, 0.45)
  hemiLight.layers.enableAll()
  scene.add(hemiLight)

  // Ambient — lift the deepest blacks
  const ambientLight = new THREE.AmbientLight(0x1a2a40, 0.5)
  ambientLight.layers.enableAll()
  scene.add(ambientLight)

  /* ── Orb configs — 8 orbs at varying depths for parallax ── */
  const orbGroup = new THREE.Group()
  scene.add(orbGroup)
  const orbs: THREE.Group[] = []

  const orbConfigs = [
    // HERO — large, far right
    { color: 0xd0e2f0, emissive: 0x1a2a3a, roughness: 0.22, metalness: 0.08, clearcoat: 0.5, opacity: 0.82, size: 11, pos: [26, 5, -10], speed: 0.05 },
    // SECONDARY — upper-left
    { color: 0xc0d4e8, emissive: 0x162636, roughness: 0.28, metalness: 0.06, clearcoat: 0.4, opacity: 0.74, size: 8, pos: [-30, 16, -14], speed: 0.04 },
    // ACCENT — foreground orb, overlaps left glass card edge for 3D depth
    { color: 0xd0e2f0, emissive: 0x0a1520, roughness: 0.35, metalness: 0.05, clearcoat: 0.3, opacity: 0.50, size: 5, pos: [-26, -16, -2], speed: 0.01, fg: true },
    // MID — lower-right
    { color: 0xc4d6e8, emissive: 0x182838, roughness: 0.25, metalness: 0.07, clearcoat: 0.45, opacity: 0.70, size: 6.5, pos: [18, -14, -18], speed: 0.055 },
    // DEPTH — large, far back center
    { color: 0xb0c8de, emissive: 0x142434, roughness: 0.30, metalness: 0.04, clearcoat: 0.3, opacity: 0.48, size: 18, pos: [-5, 4, -55], speed: 0.025 },
    // FAR-LEFT — tiny, deep background
    { color: 0x98b8d0, emissive: 0x101e2c, roughness: 0.35, metalness: 0.03, clearcoat: 0.2, opacity: 0.35, size: 4, pos: [35, 12, -40], speed: 0.03 },
    // FAR-HIGH — medium-small, upper depth
    { color: 0xa8c4da, emissive: 0x121e30, roughness: 0.32, metalness: 0.05, clearcoat: 0.35, opacity: 0.40, size: 7, pos: [8, 22, -35], speed: 0.035 },
  ]

  orbConfigs.forEach((cfg) => {
    const group = new THREE.Group()
    group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
    group.userData = { basePos: [...cfg.pos], speed: cfg.speed }
    const isFg = 'fg' in cfg && cfg.fg

    // PBR sphere with environment reflections
    const geo = new THREE.SphereGeometry(cfg.size, 96, 96)
    const mat = new THREE.MeshPhysicalMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      clearcoat: cfg.clearcoat,
      clearcoatRoughness: 0.3,
      envMap: envMap,
      envMapIntensity: 0.6,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
    })
    mat.userData.baseRoughness = cfg.roughness
    const pbrMesh = new THREE.Mesh(geo, mat)
    if (isFg) pbrMesh.layers.set(1)
    group.add(pbrMesh)

    // Fresnel glow shell — tight edge glow
    const glowGeo = new THREE.SphereGeometry(cfg.size * 1.12, 48, 48)
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: glowVS,
      fragmentShader: glowFS,
      uniforms: {
        uColor: { value: new THREE.Color(0xc0ddf0) },
        uIntensity: { value: cfg.opacity * 0.22 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    if (isFg) glowMesh.layers.set(1)
    group.add(glowMesh)

    // Bloom halo — larger, softer outer glow (simulates bloom without post-processing)
    const haloGeo = new THREE.SphereGeometry(cfg.size * 1.5, 32, 32)
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: glowVS,
      fragmentShader: glowFS,
      uniforms: {
        uColor: { value: new THREE.Color(cfg.color) },
        uIntensity: { value: cfg.opacity * 0.12 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    const haloMesh = new THREE.Mesh(haloGeo, haloMat)
    if (isFg) haloMesh.layers.set(1)
    group.add(haloMesh)

    // Outer bloom — very soft, wide atmospheric glow
    const outerGeo = new THREE.SphereGeometry(cfg.size * 2.0, 24, 24)
    const outerMat = new THREE.ShaderMaterial({
      vertexShader: glowVS,
      fragmentShader: glowFS,
      uniforms: {
        uColor: { value: new THREE.Color(cfg.color) },
        uIntensity: { value: cfg.opacity * 0.04 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    const outerMesh = new THREE.Mesh(outerGeo, outerMat)
    if (isFg) outerMesh.layers.set(1)
    group.add(outerMesh)

    orbGroup.add(group)
    orbs.push(group)
  })

  /* ── Starfield — 800 stars across deep space ── */
  const starCount = 800
  const starPos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 350
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 250
    starPos[i * 3 + 2] = -60 - Math.random() * 120
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0x80a8c8,
    size: 0.12,
    transparent: true,
    opacity: 0.2,
    sizeAttenuation: true,
    depthWrite: false,
  })
  const particles = new THREE.Points(starGeo, starMat)
  scene.add(particles)

  // Mouse parallax
  let mouseX = 0, mouseY = 0
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / innerWidth - 0.5) * 2
    mouseY = (e.clientY / innerHeight - 0.5) * 2
  })

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    bgRenderer.setSize(innerWidth, innerHeight)
    fgRenderer.setSize(innerWidth, innerHeight)
  })

  // Animation loop
  const clock = new THREE.Clock()
  let isVisible = true
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden
    if (isVisible) clock.getDelta() // discard elapsed time while hidden
  })
  function animate() {
    requestAnimationFrame(animate)
    if (!isVisible) return
    const t = clock.getElapsedTime()

    // Orb float + breathe + EFFEKT #8: Depth of Field (roughness shifts based on distance)
    orbs.forEach((group) => {
      const base = group.userData.basePos
      const sp = group.userData.speed
      group.position.x = base[0] + Math.sin(t * sp) * 2.5
      group.position.y = base[1] + Math.cos(t * sp * 0.7) * 2
      group.position.z = base[2] + Math.sin(t * sp * 0.3) * 1.2
      group.scale.setScalar(1 + Math.sin(t * sp * 1.3) * 0.015)

      // Simulated DoF: orbs far from focal plane get softer (higher roughness)
      const dist = Math.abs(group.position.z - (-10)) // focal plane at z=-10
      const dofRoughness = Math.min(dist * 0.004, 0.15)
      const pbrMesh = group.children[0] as THREE.Mesh
      if (pbrMesh?.material instanceof THREE.MeshPhysicalMaterial) {
        pbrMesh.material.roughness = (pbrMesh.material.userData.baseRoughness ?? pbrMesh.material.roughness) + dofRoughness
      }
    })

    particles.rotation.y = t * 0.006
    particles.rotation.x = t * 0.003

    camera.position.x += (mouseX * 2 - camera.position.x) * 0.01
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.01
    camera.lookAt(scene.position)

    // Background pass — layer 0 (all bg orbs, stars, fog)
    camera.layers.set(0)
    bgRenderer.render(scene, camera)

    // Foreground pass — layer 1 (fg orb overlapping HTML)
    camera.layers.set(1)
    fgRenderer.render(scene, camera)
  }

  animate()
}
