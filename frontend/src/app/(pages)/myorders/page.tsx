'use client'

import { useCallback, useEffect, useState } from 'react'

import axios from 'axios'
import { CheckIcon, FileTextIcon, RefreshCwIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'
import { BACKEND, inr, useStore } from '@/context/store-context'

type Item = { name: string; quantity: number; note?: string }
type Order = {
  _id: string
  items: Item[]
  amount: number
  discount?: number
  coupon?: string
  status: string
  payment: boolean
  paymentMethod?: string
  date?: string
  statusHistory?: { status: string; at: string }[]
}

const STEPS = ['Food Processing', 'Out for delivery', 'Delivered']
const METHOD: Record<string, string> = { cod: 'Cash on delivery', razorpay: 'Razorpay', stripe: 'Card (Stripe)' }
const time = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '')

const Tracker = ({ order }: { order: Order }) => {
  const at = Math.max(STEPS.indexOf(order.status), 0)

  return (
    <ol className='mt-3 flex w-full items-start' aria-label='Order progress'>
      {STEPS.map((s, i) => {
        const when = order.statusHistory?.find(h => h.status === s)?.at

        return (
          <li key={s} className='relative flex flex-1 flex-col items-center text-center'>
            {i > 0 && <span className={cn('absolute top-3 right-1/2 h-0.5 w-full', i <= at ? 'bg-primary' : 'bg-border')} />}
            <span className={cn('relative z-10 grid size-6 place-items-center rounded-full border text-xs', i <= at ? 'bg-primary text-primary-foreground border-primary' : 'bg-background')}>
              {i <= at ? <CheckIcon className='size-3.5' /> : i + 1}
            </span>
            <span className={cn('mt-1 text-xs', i === at ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
            {when && <span className='text-muted-foreground text-[10px]'>{time(when)}</span>}
          </li>
        )
      })}
    </ol>
  )
}

const MyOrders = () => {
  const { token, setShowLogin } = useStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!token) return setLoading(false)

    try {
      const r = await axios.post(`${BACKEND}/api/order/userorders`, {}, { headers: { token } })

      if (r.data.success) setOrders([...r.data.data].reverse())
    } catch {}
    setLoading(false)
  }, [token])

  useEffect(() => {
    load()

    // Refresh order status every 15 seconds.
    const t = setInterval(load, 15000)

    return () => clearInterval(t)
  }, [load])

  const invoice = async (orderId: string) => {
    setErr('')

    try {
      const r = await axios.post(`${BACKEND}/api/order/invoice`, { orderId }, { headers: { token } })

      if (!r.data.success) return setErr(r.data.message || 'Could not open the invoice')

      window.open(URL.createObjectURL(new Blob([r.data.html], { type: 'text/html' })), '_blank')
    } catch {
      setErr('Could not open the invoice. Check that the backend is running.')
    }
  }

  return (
    <div className='mx-auto w-full max-w-3xl px-4 py-12 sm:px-6'>
      <div className='flex items-center justify-between'>
        <h1 className='font-serif text-3xl font-semibold'>My orders</h1>
        {token && (
          <Button variant='outline' className='rounded-full' onClick={load}>
            <RefreshCwIcon /> Refresh
          </Button>
        )}
      </div>
      {err && <p role='alert' className='text-destructive mt-3 text-sm'>{err}</p>}
      {!token ? (
        <div className='text-muted-foreground py-16 text-center'>
          <p>Log in to see your orders.</p>
          <Button className='mt-4 rounded-full' onClick={() => setShowLogin(true)}>Log in</Button>
        </div>
      ) : loading ? (
        <p className='text-muted-foreground py-16 text-center'>Loading your orders…</p>
      ) : orders.length === 0 ? (
        <p className='text-muted-foreground py-16 text-center'>You have no orders yet.</p>
      ) : (
        <ul className='mt-6 space-y-4'>
          {orders.map(o => (
            <li key={o._id} className='rounded-2xl border p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='font-medium'>{o.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}</p>
                  {o.items.filter(i => i.note).map((i, k) => (
                    <p key={k} className='text-muted-foreground text-xs'>Note for {i.name}: {i.note}</p>
                  ))}
                  <p className='text-muted-foreground text-sm'>
                    {o.items.reduce((s, i) => s + i.quantity, 0)} items · {inr(o.amount)}
                    {o.discount ? ` (saved ${inr(o.discount)} with ${o.coupon})` : ''} · {time(o.date)}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>{o.payment ? 'Paid' : o.paymentMethod === 'cod' ? 'Pay on delivery' : 'Payment pending'}</Badge>
                  <Badge variant='outline'>{METHOD[o.paymentMethod || 'cod']}</Badge>
                </div>
              </div>
              <Tracker order={o} />
              <div className='mt-3 flex justify-end'>
                <Button variant='ghost' size='sm' onClick={() => invoice(o._id)}>
                  <FileTextIcon /> {o.payment ? 'View receipt' : 'View order summary'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MyOrders
