/**
 * Three.js animated background — large luminous orbs + particle field
 * Inspired by premium glassmorphism aesthetics (Shutterstock-style)
 */
import * as THREE from 'three'

export function initBackground(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.z = 40

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  // Large luminous orbs — the key visual (big, soft, glowing through glass)
  const spheres: THREE.Mesh[] = []
  const sphereData = [
    { color: 0x22d3ee, size: 12, pos: [14, 8, -20], speed: 0.15, opacity: 0.18 },   // cyan - large, dominant
    { color: 0xa855f7, size: 10, pos: [-12, -6, -15], speed: 0.12, opacity: 0.15 },  // purple
    { color: 0x60a5fa, size: 8, pos: [-18, 10, -25], speed: 0.18, opacity: 0.12 },   // blue - deep
    { color: 0xf472b6, size: 7, pos: [8, -14, -18], speed: 0.2, opacity: 0.1 },      // pink - accent
    { color: 0x22d3ee, size: 15, pos: [0, 0, -35], speed: 0.08, opacity: 0.08 },     // mega cyan - very far back
  ]

  sphereData.forEach((data) => {
    const geo = new THREE.SphereGeometry(data.size, 64, 64)
    const mat = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: data.opacity,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(data.pos[0], data.pos[1], data.pos[2])
    mesh.userData = { basePos: [...data.pos], speed: data.speed }
    scene.add(mesh)
    spheres.push(mesh)

    // Glow shell around each orb
    const glowGeo = new THREE.SphereGeometry(data.size * 1.4, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: data.opacity * 0.3,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.copy(mesh.position)
    mesh.userData.glow = glow
    scene.add(glow)
  })

  // Particle field — subtle star dust
  const particleCount = 350
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 10
    sizes[i] = Math.random() * 0.12 + 0.03
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    color: 0x8b9dc3,
    size: 0.08,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  })
  const particles = new THREE.Points(particleGeo, particleMat)
  scene.add(particles)

  // Mouse parallax
  let mouseX = 0
  let mouseY = 0
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2
  })

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  // Animation loop
  const clock = new THREE.Clock()
  function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    // Float spheres with organic motion
    spheres.forEach((sphere) => {
      const base = sphere.userData.basePos
      const speed = sphere.userData.speed
      sphere.position.x = base[0] + Math.sin(t * speed) * 4
      sphere.position.y = base[1] + Math.cos(t * speed * 0.7) * 3
      sphere.position.z = base[2] + Math.sin(t * speed * 0.4) * 2

      // Sync glow shell
      const glow = sphere.userData.glow
      if (glow) glow.position.copy(sphere.position)

      // Subtle breathing (scale pulse)
      const breathe = 1 + Math.sin(t * speed * 1.5) * 0.05
      sphere.scale.setScalar(breathe)
      if (glow) glow.scale.setScalar(breathe)
    })

    // Rotate particles slowly
    particles.rotation.y = t * 0.015
    particles.rotation.x = t * 0.008

    // Mouse parallax on camera
    camera.position.x += (mouseX * 3 - camera.position.x) * 0.015
    camera.position.y += (-mouseY * 3 - camera.position.y) * 0.015
    camera.lookAt(scene.position)

    renderer.render(scene, camera)
  }

  animate()
}
