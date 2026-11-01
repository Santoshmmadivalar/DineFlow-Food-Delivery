'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import axios from 'axios'

import localFoods from '@/assets/data/foods.json'

export type Food = { _id: string; name: string; description: string; price: number; image: string; category: string; veg?: boolean }
type Cart = Record<string, number>
export type Coupon = { code: string; discount: number; label?: string }

export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    ? 'https://dineflow-food-delivery-3.onrender.com'
    : process.env.NODE_ENV === 'production'
      ? 'https://dineflow-food-delivery-3.onrender.com'
      : 'http://localhost:4000')
export const DELIVERY_FEE = 40
export const FREE_DELIVERY_ABOVE = 599
export const CATEGORIES = ['Salad', 'Rolls', 'Deserts', 'Sandwich', 'Cake', 'Pure Veg', 'Pasta', 'Noodles']

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
export const deliveryFor = (subtotal: number) => (subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE)

// Images seeded from the template are local files; admin uploads are served by the backend.
export const imageSrc = (image: string) =>
  image.startsWith('food_') ? `/foodify/${image}` : `${BACKEND}/images/${image}`

const fallback: Food[] = localFoods.map(f => ({ ...f, _id: f.id, image: f.image.replace('/foodify/', '') }))

const read = <T,>(key: string, def: T): T => {
  try {
    const v = localStorage.getItem(key)

    return v ? (JSON.parse(v) as T) : def
  } catch {
    return def
  }
}

const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {}
}

type Ctx = {
  foods: Food[]
  cart: Cart
  liked: string[]
  toggleLike: (id: string) => void
  notes: Record<string, string>
  setNote: (id: string, note: string) => void
  coupon: Coupon | null
  couponMessage: string
  applyCoupon: (code: string) => Promise<boolean>
  removeCoupon: () => void
  token: string
  userName: string
  showLogin: boolean
  setShowLogin: (v: boolean) => void
  addToCart: (id: string) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  totalAmount: number
  totalCount: number
  discount: number
  login: (t: string, name?: string) => void
  logout: () => void
}

const StoreContext = createContext<Ctx | null>(null)

export const useStore = () => {
  const c = useContext(StoreContext)

  if (!c) throw new Error('useStore must be used inside StoreProvider')

  return c
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [foods, setFoods] = useState<Food[]>(fallback)
  const [cart, setCart] = useState<Cart>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [liked, setLiked] = useState<string[]>([])
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [couponMessage, setCouponMessage] = useState('')
  const [token, setToken] = useState('')
  const [userName, setUserName] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const ready = useRef(false)

  const signOutLocal = useCallback(() => {
    setToken('')
    setUserName('')
    setCart({})

    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user-name')
    } catch {}
  }, [])

  const loadCart = useCallback(
    async (t: string) => {
      try {
        const r = await axios.post(`${BACKEND}/api/cart/get`, {}, { headers: { token: t } })

        if (r.data.success) setCart(r.data.cartData || {})
        else if (/not authorized/i.test(r.data.message || '')) signOutLocal() // expired login
      } catch {}
    },
    [signOutLocal]
  )

  useEffect(() => {
    // Menu comes from the API when it is running; otherwise the bundled menu is shown.
    axios
      .get(`${BACKEND}/api/food/list`)
      .then(r => r.data.success && r.data.data.length && setFoods(r.data.data))
      .catch(() => {})

    const t = read<string>('token-raw', '') || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '')

    setNotes(read('cart-notes', {}))
    setLiked(read<string[]>('liked-dishes', []))
    setCoupon(read<Coupon | null>('cart-coupon', null))
    setUserName(typeof localStorage !== 'undefined' ? localStorage.getItem('user-name') || '' : '')

    if (t) {
      setToken(t)
      loadCart(t)
    } else setCart(read('guest-cart', {}))

    ready.current = true
  }, [loadCart])

  useEffect(() => {
    if (!ready.current) return

    write('cart-notes', notes)
    write('cart-coupon', coupon)

    if (!token) write('guest-cart', cart)
  }, [cart, notes, coupon, token])

  const totalAmount = useMemo(
    () => Object.entries(cart).reduce((s, [id, q]) => s + (foods.find(f => f._id === id)?.price || 0) * q, 0),
    [cart, foods]
  )
  const totalCount = useMemo(() => Object.values(cart).reduce((s, q) => s + q, 0), [cart])

  // Re-check the coupon whenever the cart total changes (minimum amounts may no longer be met).
  useEffect(() => {
    if (!coupon) return

    if (totalAmount === 0) {
      setCoupon(null)

      return
    }

    const t = setTimeout(() => {
      axios
        .post(`${BACKEND}/api/order/coupon`, { code: coupon.code, subtotal: totalAmount })
        .then(r => {
          if (r.data.valid) setCoupon(c => (c && c.discount !== r.data.discount ? { ...c, discount: r.data.discount } : c))
          else {
            setCoupon(null)
            setCouponMessage(r.data.message)
          }
        })
        .catch(() => {})
    }, 400)

    return () => clearTimeout(t)
  }, [totalAmount, coupon?.code]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyCoupon = async (code: string) => {
    setCouponMessage('')

    try {
      const r = await axios.post(`${BACKEND}/api/order/coupon`, { code, subtotal: totalAmount })

      setCouponMessage(r.data.message)

      if (r.data.valid) {
        setCoupon({ code: r.data.code, discount: r.data.discount, label: r.data.label })

        return true
      }
    } catch {
      setCouponMessage('Could not check the coupon. Check that the backend is running.')
    }

    return false
  }

  const removeCoupon = () => {
    setCoupon(null)
    setCouponMessage('')
  }

  const toggleLike = (id: string) =>
    setLiked(p => {
      const next = p.includes(id) ? p.filter(x => x !== id) : [...p, id]

      write('liked-dishes', next)

      return next
    })

  const setNote = (id: string, note: string) => setNotes(p => ({ ...p, [id]: note.slice(0, 120) }))

  const addToCart = (id: string) => {
    setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 }))

    if (token) axios.post(`${BACKEND}/api/cart/add`, { itemId: id }, { headers: { token } }).catch(() => {})
  }

  const removeFromCart = (id: string) => {
    setCart(p => ({ ...p, [id]: Math.max((p[id] || 0) - 1, 0) }))

    if (token) axios.post(`${BACKEND}/api/cart/remove`, { itemId: id }, { headers: { token } }).catch(() => {})
  }

  const clearCart = () => {
    setCart({})
    setNotes({})
    setCoupon(null)
  }

  const login = (t: string, name = '') => {
    setToken(t)
    setUserName(name)

    try {
      localStorage.setItem('token', t)
      localStorage.setItem('user-name', name)
      localStorage.removeItem('guest-cart')
    } catch {}
    loadCart(t)
  }

  const logout = () => {
    signOutLocal()
    setNotes({})
    setCoupon(null)
  }

  const discount = coupon ? Math.min(coupon.discount, totalAmount + deliveryFor(totalAmount)) : 0

  return (
    <StoreContext.Provider
      value={{
        foods, cart, liked, toggleLike, notes, setNote, coupon, couponMessage, applyCoupon, removeCoupon, token, userName, showLogin,
        setShowLogin, addToCart, removeFromCart, clearCart, totalAmount, totalCount, discount, login, logout
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
