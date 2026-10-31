import mongoose, { model } from "mongoose";

const foodSchema=new mongoose.Schema({
    name:{type:String,required:true},
    description:{type:String,required:true},
    price:{type:Number,required:true},
    image:{type:String,required:true},
    category:{type:String,required:true},
    veg:{type:Boolean,default:true}
})

//create model of foodschema
const foodModel=mongoose.models.food || mongoose.model("food",foodSchema);//if model there

export default foodModel;