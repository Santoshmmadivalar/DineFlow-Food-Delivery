'use client'

import { useState } from 'react'

import Link from 'next/link'

import { MinusIcon, PlusIcon, TagIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { FREE_DELIVERY_ABOVE, deliveryFor, imageSrc, inr, useStore } from '@/context/store-context'

const CartPage = () => {
  const { foods, cart, notes, setNote, coupon, couponMessage, applyCoupon, removeCoupon, discount, addToCart, removeFromCart, totalAmount, token, setShowLogin } = useStore()
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const items = foods.filter(f => (cart[f._id] || 0) > 0)
  const fee = deliveryFor(totalAmount)
  const total = items.length ? Math.max(totalAmount + fee - discount, 1) : 0

  const apply = async () => {
    setChecking(true)

    if (await applyCoupon(code)) setCode('')
    setChecking(false)
  }

  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-12 sm:px-6'>
      <h1 className='font-serif text-3xl font-semibold'>Your cart</h1>
      {items.length === 0 ? (
        <div className='text-muted-foreground py-16 text-center'>
          <p>Your cart is empty. Add a dish from the menu.</p>
          <Button asChild className='mt-4 rounded-full'>
            <Link href='/#order-menu'>Browse menu</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className='mt-6 divide-y'>
            {items.map(f => (
              <li key={f._id} className='space-y-2 py-4'>
                <div className='flex items-center gap-4'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc(f.image)} alt='' className='size-16 rounded-lg object-cover' />
                  <div className='flex-1'>
                    <p className='font-medium'>{f.name}</p>
                    <p className='text-muted-foreground text-sm'>{inr(f.price)} each</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button size='icon-sm' variant='outline' className='rounded-full' onClick={() => removeFromCart(f._id)} aria-label={`Remove one ${f.name}`}>
                      {cart[f._id] === 1 ? <Trash2Icon /> : <MinusIcon />}
                    </Button>
                    <span className='w-5 text-center'>{cart[f._id]}</span>
                    <Button size='icon-sm' variant='outline' className='rounded-full' onClick={() => addToCart(f._id)} aria-label={`Add one ${f.name}`}>
                      <PlusIcon />
                    </Button>
                  </div>
                  <p className='w-20 text-right font-medium'>{inr(f.price * cart[f._id])}</p>
                </div>
                <Input
                  value={notes[f._id] || ''}
                  onChange={e => setNote(f._id, e.target.value)}
                  placeholder='Special instructions, e.g. less spicy, no onion'
                  aria-label={`Instructions for ${f.name}`}
                  maxLength={120}
                  className='h-8 text-sm'
                />
              </li>
            ))}
          </ul>

          <div className='mt-6 grid gap-8 md:grid-cols-2'>
            <div className='space-y-2'>
              <p className='flex items-center gap-2 font-medium'>
                <TagIcon className='size-4' /> Have a coupon?
              </p>
              {coupon ? (
                <div className='flex items-center justify-between rounded-xl border border-green-600/40 bg-green-600/10 px-3 py-2 text-sm'>
                  <span>
                    <b>{coupon.code}</b> applied. You save {inr(discount)}
                  </span>
                  <button className='text-primary underline' onClick={removeCoupon}>
                    Remove
                  </button>
                </div>
              ) : (
                <div className='flex gap-2'>
                  <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder='Enter code' aria-label='Coupon code' onKeyDown={e => e.key === 'Enter' && code && apply()} />
                  <Button variant='outline' disabled={!code || checking} onClick={apply}>
                    Apply
                  </Button>
                </div>
              )}
              {couponMessage && !coupon && (
                <p role='alert' className='text-destructive text-sm'>
                  {couponMessage}
                </p>
              )}
              <p className='text-muted-foreground text-xs'>Try WELCOME10, FLAT50 or FREEDEL.</p>
            </div>

            <div className='space-y-2'>
              <div className='text-muted-foreground flex justify-between'><span>Subtotal</span><span>{inr(totalAmount)}</span></div>
              <div className='text-muted-foreground flex justify-between'><span>Delivery fee</span><span>{fee ? inr(fee) : 'Free'}</span></div>
              {fee > 0 && <p className='text-muted-foreground text-xs'>Add {inr(FREE_DELIVERY_ABOVE - totalAmount)} more for free delivery.</p>}
              {discount > 0 && <div className='flex justify-between text-green-600'><span>Discount</span><span>−{inr(discount)}</span></div>}
              <div className='flex justify-between border-t pt-2 text-lg font-semibold'><span>Total</span><span>{inr(total)}</span></div>
              {token ? (
                <Button asChild className='w-full rounded-full'>
                  <Link href='/order'>Proceed to checkout</Link>
                </Button>
              ) : (
                <Button className='w-full rounded-full' onClick={() => setShowLogin(true)}>
                  Log in to check out
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CartPage
