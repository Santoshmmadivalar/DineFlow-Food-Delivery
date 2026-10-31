import React from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'

const Navbar = ({onLogout}) => {
  return (
    <div className='navbar'>
        <img className='logo' src={assets.logo} alt="" />
        <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
          <button onClick={onLogout} style={{border:"1px solid #cfcfcf",background:"white",borderRadius:"6px",padding:"6px 14px",cursor:"pointer"}}>Log out</button>
          <img className='profile' src={assets.profile_image} alt="" />
        </div>
      
    </div>
  )
}

export default Navbar
