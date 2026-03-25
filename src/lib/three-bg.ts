/**
 * Three.js animated background — Cinematic HDR orbs
 * Post-processing: Bloom + Depth of Field
 * PBR: MeshPhysicalMaterial + Environment Map reflections
 * Atmosphere: volumetric fog sprites + deep starfield
 */
import * as THREE from 'three'
import { EffectComposer, RenderPass, BloomEffect, DepthOfFieldEffect, EffectPass } from 'postprocessing'

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

export function initBackground(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300)
  camera.position.set(0, 0, 45)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x081020, 1)
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.outputColorSpace = THREE.SRGBColorSpace

  /* ── Environment map for reflections ── */
  const envMap = createEnvMap(renderer)
  scene.environment = envMap

  /* ── Post-processing pipeline ── */
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  // Bloom — HDR glow around bright objects
  const bloom = new BloomEffect({
    intensity: 0.8,
    luminanceThreshold: 0.3,
    luminanceSmoothing: 0.7,
    mipmapBlur: true,
  })

  // Depth of Field — cinematic bokeh
  const dof = new DepthOfFieldEffect(camera, {
    focusDistance: 0.06,
    focalLength: 0.04,
    bokehScale: 3.0,
  })

  composer.addPass(new EffectPass(camera, bloom, dof))

  /* ── Lighting — multi-source for ultra-soft shadows ── */
  // Key light — upper right
  const keyLight = new THREE.DirectionalLight(0xeef4ff, 2.2)
  keyLight.position.set(60, 45, 35)
  scene.add(keyLight)

  // Fill light — soft from lower-left (kills hard terminator)
  const fillLight = new THREE.DirectionalLight(0x4a6a8a, 0.8)
  fillLight.position.set(-40, -20, 25)
  scene.add(fillLight)

  // Rim/back light — edge definition from behind
  const rimLight = new THREE.DirectionalLight(0x6090c0, 0.5)
  rimLight.position.set(-10, 30, -40)
  scene.add(rimLight)

  // Hemisphere — sky/ground gradient fill
  const hemiLight = new THREE.HemisphereLight(0x4a7aaa, 0x0a1520, 0.7)
  scene.add(hemiLight)

  // Ambient — lift the deepest blacks
  const ambientLight = new THREE.AmbientLight(0x1a2a40, 0.8)
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
    // ACCENT — small, lower-left
    { color: 0xd8e8f4, emissive: 0x1c2e40, roughness: 0.20, metalness: 0.10, clearcoat: 0.6, opacity: 0.78, size: 5, pos: [-20, -16, -6], speed: 0.07 },
    // MID — lower-right
    { color: 0xc4d6e8, emissive: 0x182838, roughness: 0.25, metalness: 0.07, clearcoat: 0.45, opacity: 0.70, size: 6.5, pos: [18, -14, -18], speed: 0.055 },
    // DEPTH — large, far back center
    { color: 0xb0c8de, emissive: 0x142434, roughness: 0.30, metalness: 0.04, clearcoat: 0.3, opacity: 0.48, size: 18, pos: [-5, 4, -55], speed: 0.025 },
    // NEAR — small, close to camera (parallax foreground)
    { color: 0xe0eef8, emissive: 0x202e3e, roughness: 0.18, metalness: 0.12, clearcoat: 0.7, opacity: 0.55, size: 3, pos: [-14, -8, 12], speed: 0.09 },
    // FAR-LEFT — tiny, deep background
    { color: 0x98b8d0, emissive: 0x101e2c, roughness: 0.35, metalness: 0.03, clearcoat: 0.2, opacity: 0.35, size: 4, pos: [35, 12, -40], speed: 0.03 },
    // FAR-HIGH — medium-small, upper depth
    { color: 0xa8c4da, emissive: 0x121e30, roughness: 0.32, metalness: 0.05, clearcoat: 0.35, opacity: 0.40, size: 7, pos: [8, 22, -35], speed: 0.035 },
  ]

  orbConfigs.forEach((cfg) => {
    const group = new THREE.Group()
    group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
    group.userData = { basePos: [...cfg.pos], speed: cfg.speed }

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
    group.add(new THREE.Mesh(geo, mat))

    // Fresnel glow shell
    const glowGeo = new THREE.SphereGeometry(cfg.size * 1.3, 48, 48)
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: glowVS,
      fragmentShader: glowFS,
      uniforms: {
        uColor: { value: new THREE.Color(0xc0ddf0) },
        uIntensity: { value: cfg.opacity * 0.3 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    group.add(new THREE.Mesh(glowGeo, glowMat))

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

  /* ── Volumetric fog sprites — soft atmosphere between orbs ── */
  const fogSprites: THREE.Sprite[] = []
  const fogTex = generateSoftCircle()
  for (let i = 0; i < 12; i++) {
    const spriteMat = new THREE.SpriteMaterial({
      map: fogTex,
      color: 0x1a3050,
      transparent: true,
      opacity: 0.04 + Math.random() * 0.03,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(spriteMat)
    const s = 25 + Math.random() * 40
    sprite.scale.set(s, s, 1)
    sprite.position.set(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 50,
      -20 - Math.random() * 60
    )
    sprite.userData = {
      basePos: [sprite.position.x, sprite.position.y, sprite.position.z],
      driftSpeed: 0.01 + Math.random() * 0.02,
    }
    scene.add(sprite)
    fogSprites.push(sprite)
  }

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
    renderer.setSize(innerWidth, innerHeight)
    composer.setSize(innerWidth, innerHeight)
  })

  // Animation loop
  const clock = new THREE.Clock()
  function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    // Orb float + breathe
    orbs.forEach((group) => {
      const base = group.userData.basePos
      const sp = group.userData.speed
      group.position.x = base[0] + Math.sin(t * sp) * 2.5
      group.position.y = base[1] + Math.cos(t * sp * 0.7) * 2
      group.position.z = base[2] + Math.sin(t * sp * 0.3) * 1.2
      group.scale.setScalar(1 + Math.sin(t * sp * 1.3) * 0.015)
    })

    // Fog drift
    fogSprites.forEach((s) => {
      const bp = s.userData.basePos
      const ds = s.userData.driftSpeed
      s.position.x = bp[0] + Math.sin(t * ds) * 8
      s.position.y = bp[1] + Math.cos(t * ds * 0.6) * 5
    })

    particles.rotation.y = t * 0.006
    particles.rotation.x = t * 0.003

    camera.position.x += (mouseX * 2 - camera.position.x) * 0.01
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.01
    camera.lookAt(scene.position)

    // Render through post-processing pipeline
    composer.render()
  }

  animate()
}

/* Generate a soft radial gradient texture for fog sprites */
function generateSoftCircle(): THREE.Texture {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.4)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  return tex
}
