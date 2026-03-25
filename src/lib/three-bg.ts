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

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  /* ── Lighting: directional from upper-right + subtle ambient fill ── */
  const dirLight = new THREE.DirectionalLight(0xc8ddf0, 2.2)
  dirLight.position.set(60, 45, 35)
  scene.add(dirLight)

  // Subtle secondary fill from lower-left (prevents orbs from being 100% dark)
  const fillLight = new THREE.DirectionalLight(0x2a4060, 0.4)
  fillLight.position.set(-40, -30, 20)
  scene.add(fillLight)

  // Very dim ambient so shadow-side isn't pure black
  const ambientLight = new THREE.AmbientLight(0x0a1525, 0.6)
  scene.add(ambientLight)

  /* ── Orb configurations — widely spread across the viewport ── */
  const orbGroup = new THREE.Group()
  scene.add(orbGroup)
  const orbs: THREE.Group[] = []

  const orbConfigs = [
    // HERO ORB — large, far right, partially off-screen
    {
      color: 0x2e6a96,
      specular: 0xd0e8ff,
      shininess: 70,
      opacity: 0.82,
      size: 11,
      pos: [26, 5, -10],
      speed: 0.05,
    },
    // SECONDARY — medium, upper-left corner
    {
      color: 0x1e5580,
      specular: 0xb8d8f5,
      shininess: 55,
      opacity: 0.72,
      size: 8,
      pos: [-30, 16, -14],
      speed: 0.04,
    },
    // ACCENT — small, lower-left
    {
      color: 0x3a7aaa,
      specular: 0xc5e0f8,
      shininess: 80,
      opacity: 0.75,
      size: 5,
      pos: [-20, -16, -6],
      speed: 0.07,
    },
    // MID — medium-small, lower-right
    {
      color: 0x255e88,
      specular: 0xc0d8f0,
      shininess: 60,
      opacity: 0.68,
      size: 6.5,
      pos: [18, -14, -18],
      speed: 0.055,
    },
    // DEPTH — large, far back center, subtle presence
    {
      color: 0x1a4870,
      specular: 0xa0c0e0,
      shininess: 40,
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

    const geo = new THREE.SphereGeometry(cfg.size, 96, 96)
    const mat = new THREE.MeshPhongMaterial({
      color: cfg.color,
      specular: cfg.specular,
      shininess: cfg.shininess,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
    })
    group.add(new THREE.Mesh(geo, mat))

    orbGroup.add(group)
    orbs.push(group)
  })

  // Fine particle field — subtle blue dust
  const particleCount = 200
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 160
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100
    positions[i * 3 + 2] = (Math.random() - 0.5) * 70 - 25
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
