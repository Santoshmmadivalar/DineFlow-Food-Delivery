'use client'

import { useMemo, useState } from 'react'

import { HeartIcon, MinusIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { cn } from '@/lib/utils'
import { CATEGORIES, imageSrc, inr, useStore } from '@/context/store-context'

type Sort = 'popular' | 'low' | 'high' | 'name'
type Kind = 'all' | 'veg' | 'nonveg'

// Green square = veg, red square = non-veg (the symbols used on Indian food packaging).
const VegMark = ({ veg }: { veg: boolean }) => (
  <span
    role='img'
    aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
    title={veg ? 'Vegetarian' : 'Non-vegetarian'}
    className={cn('mt-1 inline-grid size-4 shrink-0 place-items-center rounded-[3px] border-2', veg ? 'border-green-600' : 'border-red-600')}
  >
    <span className={cn('size-2 rounded-full', veg ? 'bg-green-600' : 'bg-red-600')} />
  </span>
)

const FoodMenu = () => {
  const { foods, cart, liked, toggleLike, addToCart, removeFromCart } = useStore()
  const [cats, setCats] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('popular')
  const [kind, setKind] = useState<Kind>('all')
  const [minP, setMinP] = useState('')
  const [maxP, setMaxP] = useState('')
  const [likedOnly, setLikedOnly] = useState(false)

  const toggle = (c: string) => setCats(p => (p.includes(c) ? p.filter(x => x !== c) : [...p, c]))

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const lo = minP === '' ? 0 : Number(minP)
    const hi = maxP === '' ? Infinity : Number(maxP)

    const list = foods.filter(f => {
      const veg = f.veg !== false

      return (
        (cats.length === 0 || cats.includes(f.category)) &&
        (kind === 'all' || (kind === 'veg' ? veg : !veg)) &&
        f.price >= lo &&
        f.price <= hi &&
        (!likedOnly || liked.includes(f._id)) &&
        (!q || `${f.name} ${f.description} ${f.category}`.toLowerCase().includes(q))
      )
    })

    if (sort === 'low') list.sort((a, b) => a.price - b.price)

    if (sort === 'high') list.sort((a, b) => b.price - a.price)

    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))

    return list
  }, [foods, cats, query, sort, kind, minP, maxP, likedOnly, liked])

  const filtered = cats.length > 0 || query.trim() !== '' || sort !== 'popular' || kind !== 'all' || minP !== '' || maxP !== '' || likedOnly

  const clear = () => {
    setCats([])
    setQuery('')
    setSort('popular')
    setKind('all')
    setMinP('')
    setMaxP('')
    setLikedOnly(false)
  }

  return (
    <section id='order-menu' className='py-12 sm:py-20'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <h2 className='font-serif text-3xl font-semibold sm:text-4xl'>Order your favourites</h2>
        <p className='text-muted-foreground mt-2'>Filter by dish type, veg or non-veg, price and your liked dishes, then add to your cart.</p>

        <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
          <div className='relative flex-1'>
            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search dishes, e.g. pasta or cake' aria-label='Search dishes' className='pl-9' />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label='Sort dishes' className='bg-background h-9 rounded-md border px-3 text-sm'>
            <option value='popular'>Sort: Featured</option>
            <option value='low'>Price: low to high</option>
            <option value='high'>Price: high to low</option>
            <option value='name'>Name: A to Z</option>
          </select>
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-x-6 gap-y-3'>
          <div className='flex items-center gap-2' role='group' aria-label='Food type'>
            {([['all', 'All'], ['veg', 'Veg'], ['nonveg', 'Non-veg']] as const).map(([k, label]) => (
              <Button key={k} variant={kind === k ? 'default' : 'outline'} size='sm' className='rounded-full' aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k !== 'all' && <span className={cn('mr-1 inline-block size-2 rounded-full', k === 'veg' ? 'bg-green-500' : 'bg-red-500')} />}
                {label}
              </Button>
            ))}
          </div>

          <div className='flex items-center gap-2 text-sm' role='group' aria-label='Price range'>
            <span className='text-muted-foreground'>Price ₹</span>
            <Input type='number' min={0} inputMode='numeric' value={minP} onChange={e => setMinP(e.target.value)} placeholder='Min' aria-label='Minimum price' className='h-8 w-20' />
            <span className='text-muted-foreground'>to</span>
            <Input type='number' min={0} inputMode='numeric' value={maxP} onChange={e => setMaxP(e.target.value)} placeholder='Max' aria-label='Maximum price' className='h-8 w-20' />
          </div>

          <Button variant={likedOnly ? 'default' : 'outline'} size='sm' className='rounded-full' aria-pressed={likedOnly} onClick={() => setLikedOnly(v => !v)}>
            <HeartIcon className={cn(likedOnly && 'fill-current')} /> Liked ({liked.length})
          </Button>
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-2' role='group' aria-label='Menu categories'>
          <Button variant={cats.length === 0 ? 'default' : 'outline'} className='rounded-full' aria-pressed={cats.length === 0} onClick={() => setCats([])}>
            All dishes
          </Button>
          {CATEGORIES.map(c => (
            <Button key={c} variant={cats.includes(c) ? 'default' : 'outline'} className='rounded-full' aria-pressed={cats.includes(c)} onClick={() => toggle(c)}>
              {c}
            </Button>
          ))}
        </div>

        <div className='text-muted-foreground mt-4 flex items-center justify-between text-sm'>
          <span>
            {shown.length} {shown.length === 1 ? 'dish' : 'dishes'}
          </span>
          {filtered && (
            <button className='text-primary inline-flex items-center gap-1 underline' onClick={clear}>
              <XIcon className='size-3' /> Clear filters
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className='text-muted-foreground py-16 text-center'>
            {likedOnly && liked.length === 0 ? 'You have not liked any dishes yet. Tap the heart on a dish to save it.' : 'No dishes match your filters. Try changing the type, price or category.'}
          </p>
        ) : (
          <div className='mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
            {shown.map(f => {
              const q = cart[f._id] || 0
              const isLiked = liked.includes(f._id)

              return (
                <Card key={f._id} className='group gap-3 overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'>
                  <div className='relative'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc(f.image)} alt={f.name} className='aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105' loading='lazy' />
                    <button
                      onClick={() => toggleLike(f._id)}
                      aria-pressed={isLiked}
                      aria-label={isLiked ? `Remove ${f.name} from liked dishes` : `Like ${f.name}`}
                      className='bg-background/90 absolute top-2 right-2 grid size-8 place-items-center rounded-full shadow'
                    >
                      <HeartIcon className={cn('size-4', isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
                    </button>
                  </div>
                  <div className='flex flex-1 flex-col gap-2 p-4 pt-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex items-start gap-2'>
                        <VegMark veg={f.veg !== false} />
                        <h3 className='text-lg leading-snug font-semibold'>{f.name}</h3>
                      </div>
                      <span className='text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs whitespace-nowrap'>{f.category}</span>
                    </div>
                    <p className='text-muted-foreground line-clamp-2 flex-1 text-sm'>{f.description}</p>
                    <div className='mt-2 flex items-center justify-between'>
                      <span className='text-primary text-lg font-semibold'>{inr(f.price)}</span>
                      {q === 0 ? (
                        <Button size='sm' className='rounded-full' onClick={() => addToCart(f._id)}>
                          <PlusIcon /> Add
                        </Button>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <Button size='icon-sm' variant='outline' className='rounded-full' onClick={() => removeFromCart(f._id)} aria-label={`Remove one ${f.name}`}>
                            <MinusIcon />
                          </Button>
                          <span className='w-5 text-center font-medium'>{q}</span>
                          <Button size='icon-sm' className='rounded-full' onClick={() => addToCart(f._id)} aria-label={`Add one ${f.name}`}>
                            <PlusIcon />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default FoodMenu
