import React, { useEffect, useState } from 'react';
import './List.css'
import axios from 'axios'
import {toast} from "react-toastify"

const CATEGORIES=["Salad","Rolls","Deserts","Sandwich","Cake","Pure Veg","Pasta","Noodles"];

const List = ({url}) => {
  const [list,setList]=useState([]);
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("All");
  const [edit,setEdit]=useState(null);//dish being edited
  const [newImage,setNewImage]=useState(null);
  const [saving,setSaving]=useState(false);

  const fetchList=async()=>{
    const response=await axios.get(`${url}/api/food/list`);
    if(response.data.success){
      setList(response.data.data);//response true
    }else{
      toast.error("Error");
    }
  }

  const removeFood=async(foodId,name)=>{
   if(!window.confirm(`Delete "${name}" from the menu?`)) return;
   const response=await axios.post(`${url}/api/food/remove`,{id:foodId});//post method remove pass id as foodId
   await fetchList(); //again fetch from db
   if(response.data.success){
    toast.success(response.data.message);
   }else{
    toast.error(response.data.message || "Error");
   }
  }

  const openEdit=(item)=>{setEdit({id:item._id,name:item.name,description:item.description,price:item.price,category:item.category,veg:item.veg!==false,image:item.image});setNewImage(null);}

  const saveEdit=async(e)=>{
    e.preventDefault();
    if(edit.name.trim().length<2) return toast.error("Enter the dish name");
    if(!(Number(edit.price)>=1)) return toast.error("Enter a price in rupees, for example 250");
    if(newImage && newImage.size>5*1024*1024) return toast.error("Image must be under 5 MB");
    const fd=new FormData();
    fd.append("id",edit.id);fd.append("name",edit.name.trim());fd.append("description",edit.description.trim());
    fd.append("price",Number(edit.price));fd.append("category",edit.category);fd.append("veg",edit.veg?"true":"false");
    if(newImage) fd.append("image",newImage);
    setSaving(true);
    try{
      const res=await axios.post(`${url}/api/food/update`,fd);
      if(res.data.success){toast.success(res.data.message);setEdit(null);await fetchList();}
      else toast.error(res.data.message);
    }catch{toast.error("Could not reach the server");}
    setSaving(false);
  }

  useEffect(()=>{
    fetchList();
  },[])

  const shown=list.filter(i=>(cat==="All"||i.category===cat)&&i.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className='list add flex-col'>
      <p>All dishes ({shown.length} of {list.length})</p>
      <div className='list-filters'>
        <input placeholder='Search dishes' value={search} onChange={e=>setSearch(e.target.value)} aria-label='Search dishes'/>
        <select value={cat} onChange={e=>setCat(e.target.value)} aria-label='Filter by category'>
          <option>All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div className='list=table'>
        <div className='list-table-format title'>
          <b>Image</b>
          <b>Name</b>
          <b>Category</b>
          <b>Price</b>
          <b>Action</b>
        </div>
        {shown.map((item)=>{
          return(
            <div key={item._id} className='list-table-format'>
              <img src={`${url}/images/${item.image}`} alt="" />
              <p>{item.name}</p>
              <p>{item.category} <span style={{color:item.veg===false?"#c0392b":"#16a34a",fontWeight:600}}>{item.veg===false?"Non-veg":"Veg"}</span></p>
              <p>₹{item.price}</p>
              <p className='row-actions'>
                <span onClick={()=>openEdit(item)} className='cursor' role="button" aria-label={`Edit ${item.name}`}>Edit</span>
                <span onClick={()=>removeFood(item._id,item.name)} className='cursor' role="button" aria-label={`Delete ${item.name}`}>Delete</span>
              </p>
            </div>
          )
        })}
        {shown.length===0&&<p style={{padding:"16px 0",color:"#777"}}>No dishes match.</p>}
      </div>

      {edit&&(
        <div className='edit-overlay' onClick={()=>setEdit(null)}>
          <form className='edit-modal flex-col' onClick={e=>e.stopPropagation()} onSubmit={saveEdit}>
            <h3>Edit dish</h3>
            <img className='edit-img' src={newImage?URL.createObjectURL(newImage):`${url}/images/${edit.image}`} alt=""/>
            <label className='cursor edit-file'>Change image (optional)<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>setNewImage(e.target.files[0]||null)}/></label>
            <input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} placeholder='Dish name' required/>
            <textarea rows="3" value={edit.description} onChange={e=>setEdit({...edit,description:e.target.value})} placeholder='Description' required/>
            <div className='edit-row'>
              <select value={edit.veg?"true":"false"} onChange={e=>setEdit({...edit,veg:e.target.value==="true"})} aria-label='Food type'><option value="true">Veg</option><option value="false">Non-veg</option></select>
              <select value={edit.category} onChange={e=>setEdit({...edit,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
              <input type="number" min="1" value={edit.price} onChange={e=>setEdit({...edit,price:e.target.value})} placeholder='₹ price' required/>
            </div>
            <div className='edit-row'>
              <button type="button" className='btn-secondary' onClick={()=>setEdit(null)}>Cancel</button>
              <button type="submit" disabled={saving}>{saving?"Saving...":"Save changes"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default List;
