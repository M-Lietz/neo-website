/**
 * Three.js animated background — HDR volumetric orbs
 * Reference: Shutterstock "Dark Glassmorphism Frosted Layout"
 *
 * Architecture: Each orb = 3 concentric layers
 *   1. SOLID CORE (NormalBlending) — semi-opaque luminous sphere, visible shape
 *   2. SURFACE GLOW (AdditiveBlending) — bright Fresnel rim for 3D definition 
 *   3. OUTER HAZE (AdditiveBlending) — soft volumetric light bleed
 *
 * The orbs must look like physical glowing objects, not fog.
 */
import * as THREE from 'three'

/* ── Solid core: high-opacity center, smooth falloff, VISIBLE sphere shape ── */
const coreVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const coreFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uCoreColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float NdotV = max(dot(vNormal, vViewDir), 0.0);
    
    // Layered opacity: hot center fading to edges but keeping sphere shape visible
    float center = pow(NdotV, 0.8);          // broad center coverage  
    float hotspot = pow(NdotV, 3.0) * 0.5;  // bright hotspot
    float edge = smoothstep(0.0, 0.35, NdotV) * 0.25; // soft edge visibility
    float alpha = (center + hotspot + edge) * uIntensity;
    
    // Color: white-hot center → tinted blue at edges
    vec3 color = mix(uColor, uCoreColor, pow(NdotV, 1.5));
    
    // Subtle surface sheen (Fresnel rim highlight for 3D definition)
    float rim = pow(1.0 - NdotV, 3.0) * 0.15;
    color += vec3(0.4, 0.55, 0.7) * rim;
    
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`

/* ── Surface glow: additive light emission around the sphere boundary ── */
const glowFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFalloff;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float NdotV = max(dot(vNormal, vViewDir), 0.0);
    // Glow concentrated around the sphere surface, not from center
    float shell = pow(NdotV, uFalloff) * (1.0 - pow(NdotV, uFalloff * 4.0));
    // Add some center fill too
    float fill = pow(NdotV, uFalloff * 0.5) * 0.3;
    float alpha = (shell + fill) * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`

/* ── Outer haze: large soft atmospheric scatter ── */
const hazeFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float NdotV = max(dot(vNormal, vViewDir), 0.0);
    float glow = pow(NdotV, 0.6) * 0.7 + pow(NdotV, 2.0) * 0.3;
    float alpha = glow * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`

export function initBackground(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300)
  camera.position.z = 45

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  /* ── Orb configurations — matching reference layout ── */
  const orbGroup = new THREE.Group()
  scene.add(orbGroup)
  const orbs: THREE.Group[] = []

  const orbConfigs = [
    // DOMINANT ORB — large, right-center, bright (the "hero" orb from reference)
    {
      coreColor: new THREE.Color(0.88, 0.93, 0.97),  // near-white center
      edgeColor: new THREE.Color(0.38, 0.58, 0.75),   // cool blue edge
      glowColor: new THREE.Color(0.50, 0.70, 0.85),   // mid blue glow
      hazeColor: new THREE.Color(0.20, 0.35, 0.50),   // deep blue atmosphere
      size: 10,
      pos: [10, 4, -14],
      speed: 0.06,
      coreIntensity: 0.92,
      glowIntensity: 0.45,
      glowFalloff: 1.4,
      hazeScale: 2.8,
      hazeIntensity: 0.08,
    },
    // SECONDARY ORB — medium, upper-left
    {
      coreColor: new THREE.Color(0.82, 0.90, 0.95),
      edgeColor: new THREE.Color(0.30, 0.50, 0.68),
      glowColor: new THREE.Color(0.40, 0.60, 0.78),
      hazeColor: new THREE.Color(0.16, 0.28, 0.42),
      size: 6.5,
      pos: [-12, 8, -10],
      speed: 0.05,
      coreIntensity: 0.78,
      glowIntensity: 0.38,
      glowFalloff: 1.6,
      hazeScale: 2.5,
      hazeIntensity: 0.06,
    },
    // ACCENT ORB — small, lower-left
    {
      coreColor: new THREE.Color(0.78, 0.87, 0.93),
      edgeColor: new THREE.Color(0.28, 0.46, 0.62),
      glowColor: new THREE.Color(0.35, 0.55, 0.72),
      hazeColor: new THREE.Color(0.14, 0.25, 0.38),
      size: 4.5,
      pos: [-6, -7, -8],
      speed: 0.08,
      coreIntensity: 0.65,
      glowIntensity: 0.30,
      glowFalloff: 1.8,
      hazeScale: 2.6,
      hazeIntensity: 0.05,
    },
    // DEPTH ORB — large, far back, adds volumetric depth
    {
      coreColor: new THREE.Color(0.70, 0.82, 0.90),
      edgeColor: new THREE.Color(0.22, 0.38, 0.55),
      glowColor: new THREE.Color(0.30, 0.48, 0.65),
      hazeColor: new THREE.Color(0.12, 0.20, 0.32),
      size: 16,
      pos: [0, -2, -45],
      speed: 0.03,
      coreIntensity: 0.35,
      glowIntensity: 0.18,
      glowFalloff: 1.2,
      hazeScale: 2.2,
      hazeIntensity: 0.03,
    },
  ]

  orbConfigs.forEach((cfg) => {
    const group = new THREE.Group()
    group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
    group.userData = { basePos: [...cfg.pos], speed: cfg.speed }

    // Layer 1: SOLID CORE — NormalBlending, visible sphere shape
    const coreGeo = new THREE.SphereGeometry(cfg.size, 96, 96)
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: {
        uColor: { value: cfg.edgeColor },
        uCoreColor: { value: cfg.coreColor },
        uIntensity: { value: cfg.coreIntensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
    })
    group.add(new THREE.Mesh(coreGeo, coreMat))

    // Layer 2: SURFACE GLOW — bright emission around sphere boundary
    const glowGeo = new THREE.SphereGeometry(cfg.size * 1.35, 64, 64)
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        uColor: { value: cfg.glowColor },
        uIntensity: { value: cfg.glowIntensity },
        uFalloff: { value: cfg.glowFalloff },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    group.add(new THREE.Mesh(glowGeo, glowMat))

    // Layer 3: OUTER HAZE — soft volumetric light scatter
    const hazeGeo = new THREE.SphereGeometry(cfg.size * cfg.hazeScale, 48, 48)
    const hazeMat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: hazeFragmentShader,
      uniforms: {
        uColor: { value: cfg.hazeColor },
        uIntensity: { value: cfg.hazeIntensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    group.add(new THREE.Mesh(hazeGeo, hazeMat))

    group.userData.coreMat = coreMat
    orbGroup.add(group)
    orbs.push(group)
  })

  // Fine particle field — subtle blue dust in the void
  const particleCount = 180
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 130
    positions[i * 3 + 1] = (Math.random() - 0.5) * 90
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 25
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    color: 0x3a6585,
    size: 0.06,
    transparent: true,
    opacity: 0.30,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new THREE.Points(particleGeo, particleMat))
  const particles = scene.children[scene.children.length - 1] as THREE.Points

  // Mouse parallax
  let mouseX = 0, mouseY = 0
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2
  })

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  // Animation
  const clock = new THREE.Clock()
  function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    orbs.forEach((group) => {
      const base = group.userData.basePos
      const speed = group.userData.speed
      // Slow, organic floating
      group.position.x = base[0] + Math.sin(t * speed) * 2.5
      group.position.y = base[1] + Math.cos(t * speed * 0.7) * 2
      group.position.z = base[2] + Math.sin(t * speed * 0.3) * 1.2
      // Very subtle breathing
      const breathe = 1 + Math.sin(t * speed * 1.3) * 0.02
      group.scale.setScalar(breathe)
    })

    // Slow particle drift
    particles.rotation.y = t * 0.006
    particles.rotation.x = t * 0.003

    // Subtle mouse parallax on camera
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.01
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.01
    camera.lookAt(scene.position)

    renderer.render(scene, camera)
  }

  animate()
}
