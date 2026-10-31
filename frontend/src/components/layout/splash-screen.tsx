'use client'

import { useEffect, useState } from 'react'

import DineFlowLogo from '@/assets/svg/dineflow-logo'

// Full-screen loader shown once per visit, then fades out.
const SplashScreen = () => {
  const [hide, setHide] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    let seen = false

    try {
      seen = sessionStorage.getItem('dineflow-splash') === '1'
      sessionStorage.setItem('dineflow-splash', '1')
    } catch {}

    const t1 = setTimeout(() => setHide(true), seen ? 0 : 1700)
    const t2 = setTimeout(() => setGone(true), seen ? 600 : 2400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (gone) return null

  return (
    <div className={`df-splash${hide ? ' hide' : ''}`} role='status' aria-label='Loading DineFlow'>
      <div>
        <div className='df-splash-mark'>
          <span className='df-splash-ring' />
          <DineFlowLogo />
        </div>
        <p className='df-splash-name'>DineFlow</p>
        <p className='df-splash-tag'>Fresh food, delivered fast</p>
        <div className='df-splash-bar'>
          <i />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
