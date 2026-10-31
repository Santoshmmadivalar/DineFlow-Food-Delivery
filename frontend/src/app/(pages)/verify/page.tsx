'use client'

import { Suspense, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import axios from 'axios'

import { Button } from '@/components/ui/button'

import { BACKEND, useStore } from '@/context/store-context'

const Verify = () => {
  const params = useSearchParams()
  const { clearCart, token, setShowLogin } = useStore()
  const [state, setState] = useState<'checking' | 'ok' | 'fail' | 'login'>('checking')
  const started = useRef(false)

  useEffect(() => {
    if (!token) {
      // The saved login loads a moment after the page opens.
      const t = setTimeout(() => setState('login'), 1200)

      return () => clearTimeout(t)
    }

    if (started.current) return

    started.current = true
    setState('checking')

    axios
      .post(
        `${BACKEND}/api/order/verify`,
        { success: params.get('success'), orderId: params.get('orderId'), session_id: params.get('session_id') },
        { headers: { token } }
      )
      .then(r => {
        setState(r.data.success ? 'ok' : 'fail')

        if (r.data.success) clearCart()
      })
      .catch(() => setState('fail'))
  }, [params, token, clearCart])

  const title = { checking: 'Confirming your order…', ok: 'Order placed', fail: 'Payment not completed', login: 'Log in to see your order' }[state]

  return (
    <div className='mx-auto max-w-md px-4 py-24 text-center'>
      <h1 className='font-serif text-3xl font-semibold'>{title}</h1>
      {state === 'login' && (
        <Button className='mt-6 rounded-full' onClick={() => setShowLogin(true)}>
          Log in
        </Button>
      )}
      {(state === 'ok' || state === 'fail') && (
        <>
          <p className='text-muted-foreground mt-3'>
            {state === 'ok'
              ? 'Thank you! Your food is being prepared. Your receipt is emailed once payment is confirmed, and you can track the order under My orders.'
              : 'No payment was taken and no order was placed. Your items may still be in your cart.'}
          </p>
          <Button asChild className='mt-6 rounded-full'>
            <Link href={state === 'ok' ? '/myorders' : '/cart'}>{state === 'ok' ? 'View my orders' : 'Back to cart'}</Link>
          </Button>
        </>
      )}
    </div>
  )
}

const VerifyPage = () => (
  <Suspense>
    <Verify />
  </Suspense>
)

export default VerifyPage
