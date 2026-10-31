import type { ReactNode } from 'react'

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { navigationData } from '@/assets/data/header'
import { StoreProvider } from '@/context/store-context'
import LoginDialog from '@/components/food/login-dialog'
import SplashScreen from '@/components/layout/splash-screen'
import ScrollReveal from '@/components/layout/scroll-reveal'

const PagesLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <StoreProvider>
    <div className='flex flex-col'>
      {/* Header Section */}
      <Header navigationData={navigationData} />

      {/* Main Content */}
      <main className='flex flex-col pt-17.5 *:scroll-mt-16'>{children}</main>

      {/* Footer Section */}
      <Footer />
    </div>
    <LoginDialog />
    <SplashScreen />
    <ScrollReveal />
    </StoreProvider>
  )
}

export default PagesLayout
