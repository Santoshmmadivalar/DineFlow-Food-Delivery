import React, { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import './Login.css'

const Login = ({ url, onLogin }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await axios.post(`${url}/api/admin/login`, { email, password })
      if (res.data.success) onLogin(res.data.token)
      else toast.error(res.data.message)
    } catch {
      toast.error("Could not reach the server. Check that the backend is running.")
    }
    setBusy(false)
  }

  return (
    <div className="admin-login">
      <form onSubmit={submit}>
        <h2>DineFlow Admin</h2>
        <p>Sign in to add and delete dishes and manage orders.</p>
        <input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        <small style={{textAlign:"center",color:"#888"}}>Designed &amp; developed by Santosh M Madivalar</small>
      </form>
    </div>
  )
}

export default Login
