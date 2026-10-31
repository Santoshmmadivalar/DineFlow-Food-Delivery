'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { useRouter } from 'next/navigation'

import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { BACKEND, deliveryFor, inr, useStore } from '@/context/store-context'

type RazorpayInstance = { open: () => void; on: (event: string, cb: () => void) => void }
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance

declare global {
  interface Window {
    Razorpay?: RazorpayCtor
  }
}

const loadRazorpay = () =>
  new Promise<boolean>(resolve => {
    if (window.Razorpay) return resolve(true)

    const s = document.createElement('script')

    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

const fields = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['email', 'Email'],
  ['street', 'House no. and street'],
  ['city', 'City'],
  ['state', 'State'],
  ['zipCode', 'PIN code'],
  ['phone', 'Mobile number']
] as const

const OrderPage = () => {
  const { foods, cart, notes, coupon, discount, token, userName, totalAmount, totalCount, setShowLogin } = useStore()
  const router = useRouter()
  const [data, setData] = useState<Record<string, string>>({ city: 'Bengaluru', state: 'Karnataka' })
  const [method, setMethod] = useState<'cod' | 'razorpay' | 'stripe'>('cod')
  const [busy, setBusy] = useState(false)
  const [avail, setAvail] = useState({ razorpay: false, stripe: false })
  const [error, setError] = useState('')
  const fee = deliveryFor(totalAmount)
  const total = Math.max(totalAmount + fee - discount, 1)

  useEffect(() => {
    axios
      .get(`${BACKEND}/api/order/config`)
      .then(r => setAvail({ razorpay: Boolean(r.data.razorpay), stripe: Boolean(r.data.stripe) }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Give the stored login and cart a moment to load before redirecting.
    const t = setTimeout(() => {
      if (!token) {
        setShowLogin(true)
        router.replace('/cart')
      } else if (totalCount === 0) router.replace('/cart')
    }, 700)

    return () => clearTimeout(t)
  }, [token, totalCount, router, setShowLogin])

  useEffect(() => {
    if (userName && !data.firstName) setData(d => ({ ...d, firstName: userName.split(' ')[0] }))
  }, [userName, data.firstName])

  const validate = () => {
    if (fields.some(([k]) => !data[k]?.trim())) return 'Fill in all delivery details'

    if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) return 'Enter a valid email address'

    const digits = data.phone.replace(/[\s-]/g, '')
    const mobile = /^\+?91\d{10}$/.test(digits) ? digits.replace(/^\+?91/, '') : digits

    if (!/^[6-9]\d{9}$/.test(mobile)) return 'Enter a valid 10-digit mobile number'

    if (!/^\d{6}$/.test(data.zipCode.trim())) return 'Enter a valid 6-digit PIN code'

    return ''
  }

  const cancelOrder = (orderId: string) =>
    axios.post(`${BACKEND}/api/order/razorpay/cancel`, { orderId }, { headers: { token } }).catch(() => {})

  const payWithRazorpay = async (orderId: string, rz: { key: string; orderId: string; amount: number; currency: string }) => {
    if (!(await loadRazorpay()) || !window.Razorpay) {
      await cancelOrder(orderId)

      return setError('Could not load the payment window. Check your internet connection and try again.')
    }

    const failed = async (msg: string) => {
      await cancelOrder(orderId)
      setError(msg)
      setBusy(false)
    }

    const checkout = new window.Razorpay({
      key: rz.key,
      amount: rz.amount,
      currency: rz.currency,
      order_id: rz.orderId,
      name: 'DineFlow',
      description: 'Food order',
      prefill: { name: `${data.firstName} ${data.lastName}`.trim(), email: data.email, contact: data.phone },
      theme: { color: '#d4351c' },
      handler: async (resp: Record<string, string>) => {
        try {
          const v = await axios.post(`${BACKEND}/api/order/razorpay/verify`, { orderId, ...resp }, { headers: { token } })

          if (v.data.success) router.push(`/verify?success=true&orderId=${orderId}`)
          else setError(v.data.message || 'Payment could not be verified. If money was deducted, contact us with your payment ID.')
        } catch {
          setError('Could not confirm your payment. If money was deducted, contact us.')
        }
        setBusy(false)
      },
      modal: { ondismiss: () => failed('Payment cancelled. No order was placed.') }
    })

    checkout.on('payment.failed', () => failed('Payment failed. No money was taken. Please try again.'))
    checkout.open()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    const problem = validate()

    if (problem) return setError(problem)

    setBusy(true)
    setError('')

    const items = foods.filter(f => (cart[f._id] || 0) > 0).map(f => ({ _id: f._id, quantity: cart[f._id], note: notes[f._id] || '' }))

    try {
      const r = await axios.post(
        `${BACKEND}/api/order/place`,
        { address: { ...data, country: 'India' }, items, paymentMethod: method, coupon: coupon?.code },
        { headers: { token } }
      )

      if (!r.data.success) setError(r.data.message || 'We could not place your order. Please try again.')
      else if (r.data.razorpay) await payWithRazorpay(r.data.orderId, r.data.razorpay)
      else if (r.data.session_url) window.location.assign(r.data.session_url)
      else router.push(`/verify?success=true&orderId=${r.data.orderId}`)
    } catch {
      setError('Could not reach the server. Check that the backend is running.')
    }
    setBusy(false)
  }

  return (
    <form noValidate onSubmit={submit} className='mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2'>
      <div className='space-y-3'>
        <h1 className='font-serif text-3xl font-semibold'>Delivery details</h1>
        <div className='grid grid-cols-2 gap-3'>
          {fields.map(([k, label]) => (
            <Input
              key={k}
              aria-label={label}
              placeholder={label}
              type={k === 'email' ? 'email' : 'text'}
              inputMode={k === 'phone' || k === 'zipCode' ? 'numeric' : undefined}
              className={['street', 'email'].includes(k) ? 'col-span-2' : ''}
              value={data[k] || ''}
              onChange={e => setData({ ...data, [k]: e.target.value })}
            />
          ))}
        </div>
        <fieldset className='space-y-2 pt-3'>
          <legend className='mb-1 font-medium'>Payment method</legend>
          {(
            [
              ['cod', 'Cash on delivery', 'Pay when your food arrives', true],
              ['razorpay', 'Razorpay', avail.razorpay ? 'UPI, cards, wallets and net banking' : 'Not available right now', avail.razorpay],
              ['stripe', 'Credit / debit card (Stripe)', avail.stripe ? 'Secure card payment' : 'Not available right now', avail.stripe]
            ] as const
          ).map(([v, t, d, ok]) => (
            <label key={v} className={`flex items-start gap-3 rounded-xl border p-3 has-[:checked]:border-primary ${!ok ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input type='radio' name='pay' disabled={!ok} checked={method === v} onChange={() => setMethod(v)} className='mt-1' />
              <span>
                <span className='block font-medium'>{t}</span>
                <span className='text-muted-foreground text-sm'>{d}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className='space-y-3 self-start rounded-2xl border p-6'>
        <h2 className='text-xl font-semibold'>Order total</h2>
        <div className='text-muted-foreground flex justify-between'><span>Subtotal</span><span>{inr(totalAmount)}</span></div>
        <div className='text-muted-foreground flex justify-between'><span>Delivery fee</span><span>{fee ? inr(fee) : 'Free'}</span></div>
        {discount > 0 && <div className='flex justify-between text-green-600'><span>Discount ({coupon?.code})</span><span>−{inr(discount)}</span></div>}
        <div className='flex justify-between border-t pt-2 text-lg font-semibold'><span>Total</span><span>{inr(total)}</span></div>
        {error && <p role='alert' className='text-destructive text-sm'>{error}</p>}
        <Button type='submit' className='w-full rounded-full' disabled={busy}>
          {busy ? 'Please wait…' : method === 'cod' ? 'Place order' : `Pay ${inr(total)}`}
        </Button>
      </div>
    </form>
  )
}

export default OrderPage
