/**
 * Three.js animated background — Directionally-lit orbs
 * Reference: Shutterstock "Dark Glassmorphism Frosted Layout"
 *
 * Architecture: Each orb = single MeshPhongMaterial sphere
 * Lit by a DirectionalLight from upper-right → specular highlight
 * on upper-right surface, shadow falloff on lower-left.
 * No glow, no haze — clean physical spheres.
 */
import * as THREE from 'three'

export function initBackground(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300)
  camera.position.z = 45

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setClearColor(0x081020, 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  /* ── Lighting: single directional from upper-right ── */
  const dirLight = new THREE.DirectionalLight(0xffffff, 3.0)
  dirLight.position.set(60, 45, 35)
  scene.add(dirLight)

  // Minimal ambient — shadow side stays dark marine, no second reflection
  const ambientLight = new THREE.AmbientLight(0x1a2a40, 0.5)
  scene.add(ambientLight)

  /* ── Orb configurations — widely spread across the viewport ── */
  const orbGroup = new THREE.Group()
  scene.add(orbGroup)
  const orbs: THREE.Group[] = []

  const orbConfigs = [
    // HERO ORB — large, far right, partially off-screen
    {
      color: 0xc8dae8,
      emissive: 0x1a2a3a,
      specular: 0xffffff,
      shininess: 90,
      opacity: 0.80,
      size: 11,
      pos: [26, 5, -10],
      speed: 0.05,
    },
    // SECONDARY — medium, upper-left corner
    {
      color: 0xb8cee0,
      emissive: 0x162636,
      specular: 0xffffff,
      shininess: 75,
      opacity: 0.72,
      size: 8,
      pos: [-30, 16, -14],
      speed: 0.04,
    },
    // ACCENT — small, lower-left
    {
      color: 0xd0e0ee,
      emissive: 0x1c2e40,
      specular: 0xffffff,
      shininess: 100,
      opacity: 0.75,
      size: 5,
      pos: [-20, -16, -6],
      speed: 0.07,
    },
    // MID — medium-small, lower-right
    {
      color: 0xbdd0e2,
      emissive: 0x182838,
      specular: 0xffffff,
      shininess: 80,
      opacity: 0.68,
      size: 6.5,
      pos: [18, -14, -18],
      speed: 0.055,
    },
    // DEPTH — large, far back center, subtle presence
    {
      color: 0xa8c0d5,
      emissive: 0x142434,
      specular: 0xe8f0ff,
      shininess: 50,
      opacity: 0.45,
      size: 18,
      pos: [-5, 4, -55],
      speed: 0.025,
    },
  ]

  orbConfigs.forEach((cfg) => {
    const group = new THREE.Group()
    group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
    group.userData = { basePos: [...cfg.pos], speed: cfg.speed }

    // Main lit sphere
    const geo = new THREE.SphereGeometry(cfg.size, 96, 96)
    const mat = new THREE.MeshPhongMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      specular: cfg.specular,
      shininess: cfg.shininess,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
    })
    group.add(new THREE.Mesh(geo, mat))

    // Soft additive glow shell — shiny aura around the lit side
    const glowGeo = new THREE.SphereGeometry(cfg.size * 1.18, 48, 48)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xb0d4f0,
      transparent: true,
      opacity: cfg.opacity * 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
    group.add(new THREE.Mesh(glowGeo, glowMat))

    orbGroup.add(group)
    orbs.push(group)
  })

  // Very subtle starfield background
  const starCount = 600
  const starPositions = new Float32Array(starCount * 3)
  const starSizes = new Float32Array(starCount)
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 300
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 200
    starPositions[i * 3 + 2] = -50 - Math.random() * 100
    starSizes[i] = Math.random() * 0.08 + 0.02
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))
  const starMat = new THREE.PointsMaterial({
    color: 0x80a8c8,
    size: 0.12,
    transparent: true,
    opacity: 0.18,
    sizeAttenuation: true,
    depthWrite: false,
  })
  scene.add(new THREE.Points(starGeo, starMat))
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
      group.position.x = base[0] + Math.sin(t * speed) * 2.5
      group.position.y = base[1] + Math.cos(t * speed * 0.7) * 2
      group.position.z = base[2] + Math.sin(t * speed * 0.3) * 1.2
      const breathe = 1 + Math.sin(t * speed * 1.3) * 0.015
      group.scale.setScalar(breathe)
    })

    particles.rotation.y = t * 0.006
    particles.rotation.x = t * 0.003

    camera.position.x += (mouseX * 2 - camera.position.x) * 0.01
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.01
    camera.lookAt(scene.position)

    renderer.render(scene, camera)
  }

  animate()
}
