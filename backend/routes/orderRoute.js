import express from "express";
import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import {
  placeOrder, userOrders, verifyOrder, listOrders, updateStatus, paymentConfig, checkCoupon,
  verifyRazorpay, cancelOnlineOrder, getInvoice, adminInvoice, resendInvoice,
} from "../controllers/ordercontrooler.js";

const orderRouter = express.Router();

// customer
orderRouter.get("/config", paymentConfig);
orderRouter.post("/coupon", checkCoupon);
orderRouter.post("/place", authMiddleware, placeOrder);
orderRouter.post("/razorpay/verify", authMiddleware, verifyRazorpay);
orderRouter.post("/razorpay/cancel", authMiddleware, cancelOnlineOrder);
orderRouter.post("/verify", authMiddleware, verifyOrder);
orderRouter.post("/userorders", authMiddleware, userOrders);
orderRouter.post("/invoice", authMiddleware, getInvoice);

// admin
orderRouter.get("/list", adminAuth, listOrders);
orderRouter.post("/status", adminAuth, updateStatus);
orderRouter.post("/admin/invoice", adminAuth, adminInvoice);
orderRouter.post("/admin/resend", adminAuth, resendInvoice);

export default orderRouter;
