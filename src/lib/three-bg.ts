/**
 * Three.js animated background — floating gradient spheres + subtle particles
 */
import * as THREE from 'three'

export function initBackground(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.z = 30

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Floating gradient spheres (soft glow orbs)
  const spheres: THREE.Mesh[] = []
  const sphereData = [
    { color: 0xa855f7, size: 4, pos: [-8, 6, -10], speed: 0.3 },   // purple
    { color: 0x06b6d4, size: 3.5, pos: [10, -4, -12], speed: 0.25 }, // cyan
    { color: 0xec4899, size: 3, pos: [-5, -8, -8], speed: 0.35 },   // pink
    { color: 0x3b82f6, size: 2.5, pos: [7, 8, -15], speed: 0.2 },   // blue
  ]

  sphereData.forEach((data) => {
    const geo = new THREE.SphereGeometry(data.size, 32, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.12,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(data.pos[0], data.pos[1], data.pos[2])
    mesh.userData = { basePos: [...data.pos], speed: data.speed }
    scene.add(mesh)
    spheres.push(mesh)
  })

  // Subtle particle field
  const particleCount = 200
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 60
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    color: 0xa855f7,
    size: 0.08,
    transparent: true,
    opacity: 0.4,
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

    // Float spheres
    spheres.forEach((sphere) => {
      const base = sphere.userData.basePos
      const speed = sphere.userData.speed
      sphere.position.x = base[0] + Math.sin(t * speed) * 3
      sphere.position.y = base[1] + Math.cos(t * speed * 0.7) * 2
      sphere.position.z = base[2] + Math.sin(t * speed * 0.5) * 1.5
    })

    // Rotate particles slowly
    particles.rotation.y = t * 0.02
    particles.rotation.x = t * 0.01

    // Mouse parallax on camera
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.02
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02
    camera.lookAt(scene.position)

    renderer.render(scene, camera)
  }

  animate()
}
