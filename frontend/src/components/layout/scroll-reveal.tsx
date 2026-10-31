'use client'

import { useEffect } from 'react'

// Fades each page section in as it scrolls into view.
const ScrollReveal = () => {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('main section, section[id]'))

    if (!('IntersectionObserver' in window)) return

    const io = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('df-in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.08 }
    )

    els.forEach(el => {
      el.classList.add('df-rv')
      io.observe(el)
    })

    return () => io.disconnect()
  }, [])

  return null
}

export default ScrollReveal
