import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from './components/Navbar/Navbar.jsx'
import Sidebar from './components/sidebar/Sidebar.jsx'
import { Navigate, Route, Routes } from 'react-router-dom'
import Add from './pages/Add/Add.jsx'
import Orders from './pages/Orders/Orders.jsx'
import List from './pages/List/List.jsx'
import Login from './pages/Login/Login.jsx'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import { ToastContainer } from 'react-toastify'
import "react-toastify/dist/ReactToastify.css";

const url = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("admin-token") || "")

  const logout = () => {
    localStorage.removeItem("admin-token")
    setToken("")
  }

  // Send the admin token with every request, and sign out if the server says it is no longer valid.
  useEffect(() => {
    axios.defaults.headers.common["token"] = token
    const id = axios.interceptors.response.use((res) => {
      if (token && res.data && /not authorized/i.test(res.data.message || "")) logout()
      return res
    })
    return () => axios.interceptors.response.eject(id)
  }, [token])

  if (!token) {
    return (
      <>
        <ToastContainer />
        <Login url={url} onLogin={(t) => { localStorage.setItem("admin-token", t); setToken(t) }} />
      </>
    )
  }

  return (
    <div>
      <ToastContainer/>
      <Navbar onLogout={logout}/>
      <hr/>
      <div className="app-content">
        <Sidebar/>
        <Routes>
          <Route path='/' element={<Navigate to="/dashboard" replace/>}/>
          <Route path='/dashboard' element={<Dashboard url={url}/>}/>
          <Route path='/add' element={<Add url={url}/>}/>
          <Route path='/list' element={<List url={url}/>}/>
          <Route path='/orders' element={<Orders url={url}/>}/>
        </Routes>
      </div>
    </div>
  )
}

export default App
