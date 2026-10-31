'use client'

import { useState, type FormEvent } from 'react'

import axios from 'axios'
import { EyeIcon, EyeOffIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { BACKEND, useStore } from '@/context/store-context'

const LoginDialog = () => {
  const { showLogin, setShowLogin, login } = useStore()
  const [mode, setMode] = useState<'Login' | 'Sign up'>('Login')
  const [data, setData] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  if (!showLogin) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const email = data.email.trim().toLowerCase()

    if (mode === 'Sign up' && data.name.trim().length < 2) return setError('Enter your name')

    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address')

    if (data.password.length < 8) return setError('Password must be at least 8 characters')

    setBusy(true)

    try {
      const r = await axios.post(`${BACKEND}/api/user/${mode === 'Login' ? 'login' : 'register'}`, { ...data, email, name: data.name.trim() })

      if (r.data.success) {
        login(r.data.token, r.data.name || data.name.trim())
        setData({ name: '', email: '', password: '' })
        setShowLogin(false)
      } else setError(r.data.message)
    } catch {
      setError('Could not reach the server. Check that the backend is running.')
    }
    setBusy(false)
  }

  return (
    <div className='fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4' role='dialog' aria-modal='true' aria-label={mode}>
      <form noValidate onSubmit={submit} className='bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-xl'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-semibold'>{mode}</h2>
          <Button type='button' variant='ghost' size='icon' onClick={() => setShowLogin(false)} aria-label='Close'>
            <XIcon />
          </Button>
        </div>
        {mode === 'Sign up' && (
          <Input required placeholder='Your name' value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
        )}
        <Input required type='email' placeholder='Email' value={data.email} onChange={e => setData({ ...data, email: e.target.value })} />
        <div className='relative'>
          <Input
            required
            type={show ? 'text' : 'password'}
            placeholder='Password (8+ characters)'
            autoComplete={mode === 'Login' ? 'current-password' : 'new-password'}
            className='pr-10'
            value={data.password}
            onChange={e => setData({ ...data, password: e.target.value })}
          />
          <button
            type='button'
            className='text-muted-foreground absolute inset-y-0 right-3 grid place-items-center'
            onClick={() => setShow(v => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOffIcon className='size-4' /> : <EyeIcon className='size-4' />}
          </button>
        </div>
        {error && <p role='alert' className='text-destructive text-sm'>{error}</p>}
        <Button type='submit' className='w-full' disabled={busy}>
          {mode === 'Login' ? 'Log in' : 'Create account'}
        </Button>
        <p className='text-muted-foreground text-center text-sm'>
          {mode === 'Login' ? 'New here?' : 'Already have an account?'}{' '}
          <button type='button' className='text-primary underline' onClick={() => {
              setMode(mode === 'Login' ? 'Sign up' : 'Login')
              setError('')
            }}>
            {mode === 'Login' ? 'Create an account' : 'Log in'}
          </button>
        </p>
      </form>
    </div>
  )
}

export default LoginDialog
