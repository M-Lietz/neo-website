/**
 * Three.js animated background — volumetric luminous orbs
 * Reference: Dark glassmorphism with soft glowing light spheres (Shutterstock)
 * Orbs are volumetric light sources with radial falloff, NOT solid balls.
 */
import * as THREE from 'three'

/* ── Custom shader: radial glow from bright core → transparent edge ── */
const orbVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`

const orbFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFalloff;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    // Fresnel-based radial glow: bright facing camera, transparent at edges
    vec3 viewDir = normalize(vViewPosition);
    float facing = dot(vNormal, viewDir);
    // Invert: we want bright CENTER, dark edges → pow(facing, falloff)
    float glow = pow(max(facing, 0.0), uFalloff);
    // Soft inner core boost
    float core = pow(max(facing, 0.0), uFalloff * 3.0) * 0.6;
    float alpha = (glow + core) * uIntensity;
    // Color: core shifts whiter, edges stay tinted
    vec3 finalColor = mix(uColor, vec3(0.85, 0.92, 0.98), core * 0.8);
    gl_FragColor = vec4(finalColor, alpha);
  }
`

/* ── Ambient haze shader: very soft outer atmosphere ── */
const hazeFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - abs(dot(vNormal, viewDir));
    // Inverted rim: bright center, fading out
    float glow = pow(max(1.0 - rim, 0.0), 1.2);
    float alpha = glow * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`

export function initBackground(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 250)
  camera.position.z = 45

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  /*
   * Orb definitions — from the reference image:
   * - One large dominant orb (right-center), bright blue-white
   * - One medium orb (left), slightly dimmer
   * - One smaller orb (bottom-left), subtle
   * - Colors: deep cool blue core (#3a6a8a → #b0d0e4 center)
   */
  const orbGroup = new THREE.Group()
  scene.add(orbGroup)

  const orbs: THREE.Group[] = []
  const orbConfigs = [
    // Main large orb (right, like reference) — dominant, bright
    {
      color: new THREE.Color(0.52, 0.72, 0.86),  // #85b8db cool blue-white
      size: 12,
      pos: [12, 5, -16],
      speed: 0.08,
      intensity: 0.95,
      falloff: 1.6,
      hazeSize: 2.2,
      hazeIntensity: 0.12,
    },
    // Medium orb (upper-left) — secondary
    {
      color: new THREE.Color(0.42, 0.62, 0.78),  // #6b9ec7 deeper blue
      size: 8,
      pos: [-13, 7, -12],
      speed: 0.065,
      intensity: 0.75,
      falloff: 1.8,
      hazeSize: 2.0,
      hazeIntensity: 0.09,
    },
    // Small orb (lower-left) — accent
    {
      color: new THREE.Color(0.38, 0.58, 0.74),  // #6194bc muted blue
      size: 5.5,
      pos: [-8, -6, -10],
      speed: 0.10,
      intensity: 0.60,
      falloff: 2.0,
      hazeSize: 2.4,
      hazeIntensity: 0.07,
    },
    // Deep background orb — very large, very dim, adds depth
    {
      color: new THREE.Color(0.35, 0.52, 0.68),  // #5985ae deep blue
      size: 20,
      pos: [3, 0, -40],
      speed: 0.04,
      intensity: 0.25,
      falloff: 1.4,
      hazeSize: 1.8,
      hazeIntensity: 0.04,
    },
  ]

  orbConfigs.forEach((cfg) => {
    const group = new THREE.Group()
    group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
    group.userData = { basePos: [...cfg.pos], speed: cfg.speed }

    // Core orb — volumetric shader with radial falloff
    const coreGeo = new THREE.SphereGeometry(cfg.size, 64, 64)
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: orbVertexShader,
      fragmentShader: orbFragmentShader,
      uniforms: {
        uColor: { value: cfg.color },
        uIntensity: { value: cfg.intensity },
        uFalloff: { value: cfg.falloff },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    group.add(core)

    // Outer haze — soft atmospheric glow extending beyond core
    const hazeGeo = new THREE.SphereGeometry(cfg.size * cfg.hazeSize, 48, 48)
    const hazeMat = new THREE.ShaderMaterial({
      vertexShader: orbVertexShader,
      fragmentShader: hazeFragmentShader,
      uniforms: {
        uColor: { value: cfg.color.clone().lerp(new THREE.Color(0.15, 0.22, 0.32), 0.3) },
        uIntensity: { value: cfg.hazeIntensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    })
    const haze = new THREE.Mesh(hazeGeo, hazeMat)
    group.add(haze)

    group.userData.coreMat = coreMat
    orbGroup.add(group)
    orbs.push(group)
  })

  // Sparse particle field — subtle blue dust, like in reference
  const particleCount = 200
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 20
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    color: 0x4a7090,
    size: 0.06,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
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

    // Slow organic float for each orb
    orbs.forEach((group) => {
      const base = group.userData.basePos
      const speed = group.userData.speed
      group.position.x = base[0] + Math.sin(t * speed) * 3
      group.position.y = base[1] + Math.cos(t * speed * 0.7) * 2.5
      group.position.z = base[2] + Math.sin(t * speed * 0.3) * 1.5

      // Gentle breathing on intensity
      const mat = group.userData.coreMat as THREE.ShaderMaterial
      const baseIntensity = mat.uniforms.uIntensity.value
      const pulse = 1.0 + Math.sin(t * speed * 1.2) * 0.06
      mat.uniforms.uIntensity.value = baseIntensity // keep stable, pulse via scale
      const breathe = 1 + Math.sin(t * speed * 1.5) * 0.03
      group.scale.setScalar(breathe)
    })

    // Slow particle drift
    particles.rotation.y = t * 0.008
    particles.rotation.x = t * 0.004

    // Mouse parallax — subtle
    camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.012
    camera.position.y += (-mouseY * 2.5 - camera.position.y) * 0.012
    camera.lookAt(scene.position)

    renderer.render(scene, camera)
  }

  animate()
}
