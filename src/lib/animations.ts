/**
 * GSAP scroll-triggered animations
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
}
