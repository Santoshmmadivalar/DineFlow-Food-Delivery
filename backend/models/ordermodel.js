import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId:{type:String,required:true},
    items:{type:Array,required:true},
    amount:{type:Number,required:true},
    address:{type:Object,required:true},
    status:{type:String,default:"Food Processing"},
    date:{type:Date,default:Date.now},
    payment:{type:Boolean,default:false},
    paymentMethod:{type:String,enum:["cod","razorpay","stripe"],default:"cod"},
    paymentId:{type:String},
    coupon:{type:String},
    discount:{type:Number,default:0},
    statusHistory:{type:Array,default:[]},
    invoiceSentAt:{type:Date},
    stripeSessionId:{type:String},
    deliveryFee:{type:Number,default:0},
    razorpayOrderId:{type:String},
    razorpayPaymentId:{type:String}
})

const orderModel=mongoose.models.order || mongoose.model("order",orderSchema);
export default orderModel; // Export the model for use in other parts of the application