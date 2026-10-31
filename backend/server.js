import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/FoodRoute.js";
import userRouter from "./routes/UserRoute.js";
import 'dotenv/config'
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import adminRouter from "./routes/adminRoute.js";



//app config
const app=express();
const port=process.env.PORT || 4000;

//middleware
app.use(express.json())//parse json fronted req
app.use(cors())//access backend from fronted

//dp connection
connectDB().catch((e)=>{console.error(e.message);process.exit(1)});

//api endpoint
app.use("/api/food",foodRouter);

app.use("/images",express.static('uploads'))//acess images on images end point
app.use("/api/user",userRouter)//user route

app.use("/api/cart",cartRouter)//cart route

app.use("/api/order",orderRouter)//order route
app.use("/api/admin",adminRouter)//admin login

app.get("/",(req,res)=>{
    res.send("ApI working");
})

app.listen(port,()=>{//server run
    console.log(`server started on http://localhost:${port}`);
})
