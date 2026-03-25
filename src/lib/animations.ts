/**
 * GSAP scroll-triggered animations — enhanced for showcase site
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initScrollAnimations() {
  // Fade-in + slide up for all sections
  gsap.utils.toArray<HTMLElement>('[data-animate]').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
    })
  })

  // Staggered card animations
  gsap.utils.toArray<HTMLElement>('[data-stagger-parent]').forEach((parent) => {
    const children = parent.querySelectorAll('[data-stagger-child]')
    gsap.from(children, {
      scrollTrigger: {
        trigger: parent,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
    })
  })

  // Parallax elements
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax || '0.2')
    gsap.to(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
      y: () => -100 * speed,
      ease: 'none',
    })
  })

  // Counter animations
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count || '0', 10)
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      textContent: 0,
      duration: 2,
      ease: 'power1.out',
      snap: { textContent: 1 },
    })
  })

  // Section title entrance — glide in from left with glow pulse
  gsap.utils.toArray<HTMLElement>('.title-glow').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
      x: -30,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    })
    const line = el.querySelector('.title-glow-line')
    if (line) {
      gsap.from(line, {
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        width: 0,
        duration: 0.6,
        delay: 0.3,
        ease: 'power2.out',
      })
    }
  })

  // Section divider entrance — expand from center
  gsap.utils.toArray<HTMLElement>('.section-divider').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 92%',
        toggleActions: 'play none none none',
      },
      scaleX: 0,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
    })
  })

  // Service cards — scale up with stagger
  gsap.utils.toArray<HTMLElement>('.service-card').forEach((el, i) => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
      scale: 0.9,
      opacity: 0,
      duration: 0.5,
      delay: i * 0.05,
      ease: 'back.out(1.4)',
    })
  })

  // Price options — slide in from right
  gsap.utils.toArray<HTMLElement>('.price-option').forEach((el, i) => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      x: 30,
      opacity: 0,
      duration: 0.4,
      delay: i * 0.06,
      ease: 'power2.out',
    })
  })

  // Glass panels — subtle scale entrance
  gsap.utils.toArray<HTMLElement>('.glass-panel').forEach((el) => {
    if (el.closest('[data-stagger-parent]')) return // skip if already stagger-animated
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 20,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
    })
  })
}
