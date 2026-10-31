'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import { MenuIcon, ShoppingBagIcon, LogOutIcon, PackageIcon } from 'lucide-react'

import { useStore } from '@/context/store-context'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import MenuDropdown from '@/components/blocks/menu-dropdown'
import MenuNavigation from '@/components/blocks/menu-navigation'
import type { NavigationSection } from '@/components/blocks/menu-navigation'
import { ModeToggle } from '@/components/layout/mode-toggle'

import { cn } from '@/lib/utils'
import { scrollToSection } from '@/lib/utils'

import DineFlowLogo from '@/assets/svg/dineflow-logo'

// Active section hook based on which section is closest to the top of the
// viewport (accounts for header offset). This is more deterministic than
// an IntersectionObserver for this layout and avoids lingering active states.
const useActiveSection = (sectionIds: string[]) => {
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    if (!sectionIds || sectionIds.length === 0) return

    const headerHeight = 80

    const update = () => {
      let closestId = ''
      let minDistance = Number.POSITIVE_INFINITY

      sectionIds.forEach(id => {
        const el = document.getElementById(id)

        if (!el) return

        const rectTop = el.getBoundingClientRect().top - headerHeight
        const distance = Math.abs(rectTop)

        if (distance < minDistance) {
          minDistance = distance
          closestId = id
        }
      })

      // Only set an active section when it's reasonably close to the
      // viewport top. This prevents a stale/incorrect active state when
      // the user has scrolled elsewhere on the page.
      const activationThreshold = 200 // px

      if (minDistance <= activationThreshold) {
        setActiveSection(closestId)
      } else {
        setActiveSection('')
      }
    }

    // Update on scroll and resize and run once to initialise
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    update()

    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [sectionIds])

  return activeSection
}

type HeaderProps = {
  navigationData: NavigationSection[]
  className?: string
}

const Header = ({ navigationData, className }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const { totalCount, token, userName, setShowLogin, logout } = useStore()

  // Extract section IDs from navigation data - only include valid sections
  const sectionIds = navigationData.map(item => item.href?.replace('#', '')).filter(Boolean) as string[]

  // Only use active section if it's actually in our navigation list
  const detectedActiveSection = useActiveSection(sectionIds)
  const activeSection = sectionIds.includes(detectedActiveSection) ? detectedActiveSection : ''

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 z-50 h-16 w-full border-b transition-all duration-300',
        {
          'bg-background shadow-md': isScrolled
        },
        className
      )}
    >
      <div className='mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8'>
        {/* Logo */}
        <Link href='/#home' className='flex items-center gap-3'>
          <DineFlowLogo />
          <span className='text-primary text-[20px] font-semibold'>DineFlow</span>
        </Link>

        {/* Navigation */}
        <MenuNavigation
          navigationData={navigationData}
          activeSection={activeSection}
          className='**:data-[slot=navigation-menu-list]:gap-1 max-lg:hidden'
        />

        {/* Actions */}
        <div className='flex items-center'>
          <ModeToggle />
          <Button variant='ghost' size='icon' className='relative ml-2 rounded-full' asChild>
            <Link href='/cart' aria-label='Cart'>
              <ShoppingBagIcon />
              {totalCount > 0 && (
                <span className='bg-primary text-primary-foreground absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-xs'>{totalCount}</span>
              )}
            </Link>
          </Button>
          {token ? (
            <>
              {userName && <span className='text-muted-foreground hidden max-w-28 truncate text-sm lg:inline'>Hi, {userName.split(' ')[0]}</span>}
              <Button variant='ghost' size='icon' className='rounded-full' asChild>
                <Link href='/myorders' aria-label='My orders'><PackageIcon /></Link>
              </Button>
              <Button variant='ghost' size='icon' className='rounded-full' onClick={logout} aria-label='Log out'>
                <LogOutIcon />
              </Button>
            </>
          ) : (
            <Button className='ml-2 rounded-full' onClick={() => setShowLogin(true)}>
              Sign in
            </Button>
          )}

          {/* Mobile menu button */}
          <MenuDropdown
            align='end'
            navigationData={navigationData}
            activeSection={activeSection}
            trigger={
              <Button variant='outline' size='icon' className='ml-3 rounded-full lg:hidden'>
                <MenuIcon />
                <span className='sr-only'>Menu</span>
              </Button>
            }
          />
        </div>
      </div>
    </header>
  )
}

export default Header
