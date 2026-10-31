import orderModel from "../models/ordermodel.js";
import userModel from "../models/UserModel.js";
import foodModel from "../models/foodModel.js";
import Razorpay from "razorpay";
import Stripe from "stripe";
import crypto from "crypto";
import { applyCoupon } from "../config/coupons.js";
import { invoiceHtml, sendInvoice } from "../utils/invoice.js";

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, STRIPE_SECRET_KEY } = process.env;
const razorpay = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET }) : null;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const FREE_DELIVERY_ABOVE = 599; // rupees
const DELIVERY_FEE = 40; // rupees
const STATUSES = ["Food Processing", "Out for delivery", "Delivered"];

const validAddress = (a = {}) => {
  const need = ["firstName", "lastName", "email", "street", "city", "state", "zipCode", "phone"];
  if (need.some((k) => typeof a[k] !== "string" || !a[k].trim())) return "Fill in all delivery details";
  const digits = a.phone.replace(/\s|-/g, "");
  const mobile = /^\+?91\d{10}$/.test(digits) ? digits.replace(/^\+?91/, "") : digits;
  if (!/^[6-9]\d{9}$/.test(mobile)) return "Enter a valid 10-digit mobile number";
  if (!/^\d{6}$/.test(a.zipCode.trim())) return "Enter a valid 6-digit PIN code";
  if (!/\S+@\S+\.\S+/.test(a.email)) return "Enter a valid email";
  return null;
};

const cleanNote = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

// Marks an order paid and emails the receipt (only once).
const markPaid = async (order, paymentId, extra = {}) => {
  const updated = await orderModel.findByIdAndUpdate(order._id, { payment: true, paymentId, ...extra }, { new: true });
  await emailReceipt(updated || { ...order.toObject?.(), payment: true, paymentId });
};

const emailReceipt = async (order, force = false) => {
  if (!order) return { sent: false };
  if (order.invoiceSentAt && !force) return { sent: false, reason: "Already sent" };
  const r = await sendInvoice(order);
  if (r.sent) await orderModel.findByIdAndUpdate(order._id, { invoiceSentAt: new Date() });
  return r;
};

const paymentConfig = (req, res) => res.json({ success: true, razorpay: Boolean(razorpay), stripe: Boolean(stripe) });

// checks a coupon for the cart (the real discount is calculated again when the order is placed)
const checkCoupon = (req, res) => {
  const subtotal = Number(req.body.subtotal) || 0;
  const fee = subtotal >= FREE_DELIVERY_ABOVE || subtotal === 0 ? 0 : DELIVERY_FEE;
  res.json({ success: true, ...applyCoupon(req.body.code, subtotal, fee) });
};

// place an order. Prices are always read from the database, never trusted from the browser.
const placeOrder = async (req, res) => {
  const frontend_url = process.env.FRONTEND_URL || "http://localhost:3000";
  let newOrder;
  try {
    const { userId, address, paymentMethod = "cod" } = req.body;
    const requested = Array.isArray(req.body.items) ? req.body.items : [];
    const problem = validAddress(address);
    if (problem) return res.json({ success: false, message: problem });
    if (!["cod", "razorpay", "stripe"].includes(paymentMethod)) return res.json({ success: false, message: "Choose a payment method" });
    if (paymentMethod === "razorpay" && !razorpay) return res.json({ success: false, message: "Razorpay is not available right now. Please choose another payment method." });
    if (paymentMethod === "stripe" && !stripe) return res.json({ success: false, message: "Card payment is not available right now. Please choose another payment method." });

    const foods = await foodModel.find({ _id: { $in: requested.map((i) => i._id) } });
    const items = [];
    for (const r of requested) {
      const food = foods.find((f) => String(f._id) === String(r._id));
      const quantity = Math.floor(Number(r.quantity));
      if (!food || !(quantity >= 1 && quantity <= 50)) continue;
      items.push({ _id: food._id, name: food.name, price: food.price, image: food.image, quantity, note: cleanNote(r.note) });
    }
    if (!items.length) return res.json({ success: false, message: "Your cart is empty" });

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    let discount = 0;
    let coupon;
    if (req.body.coupon) {
      const c = applyCoupon(req.body.coupon, subtotal, deliveryFee);
      if (!c.valid) return res.json({ success: false, message: c.message });
      discount = c.discount;
      coupon = c.code;
    }
    const amount = Math.max(subtotal + deliveryFee - discount, 1);

    newOrder = await new orderModel({
      userId, items, amount, deliveryFee, discount, coupon, address, paymentMethod,
      statusHistory: [{ status: STATUSES[0], at: new Date() }],
    }).save();
    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    if (paymentMethod === "cod") return res.json({ success: true, orderId: newOrder._id });

    if (paymentMethod === "razorpay") {
      const rz = await razorpay.orders.create({ amount: amount * 100, currency: "INR", receipt: String(newOrder._id) });
      await orderModel.findByIdAndUpdate(newOrder._id, { razorpayOrderId: rz.id });
      return res.json({
        success: true,
        orderId: newOrder._id,
        razorpay: { key: RAZORPAY_KEY_ID, orderId: rz.id, amount: rz.amount, currency: rz.currency },
      });
    }

    // Stripe card checkout
    const line_items = items.map((i) => ({
      price_data: { currency: "inr", product_data: { name: i.name }, unit_amount: i.price * 100 },
      quantity: i.quantity,
    }));
    if (deliveryFee) {
      line_items.push({ price_data: { currency: "inr", product_data: { name: "Delivery charges" }, unit_amount: deliveryFee * 100 }, quantity: 1 });
    }
    const params = {
      line_items,
      mode: "payment",
      customer_email: address.email,
      metadata: { orderId: String(newOrder._id) },
      success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
    };
    if (discount > 0) {
      const sc = await stripe.coupons.create({ amount_off: discount * 100, currency: "inr", duration: "once", name: coupon });
      params.discounts = [{ coupon: sc.id }];
    }
    const session = await stripe.checkout.sessions.create(params);
    await orderModel.findByIdAndUpdate(newOrder._id, { stripeSessionId: session.id });
    res.json({ success: true, orderId: newOrder._id, session_url: session.url });
  } catch (error) {
    console.log(error);
    // The payment provider could not be reached: don't leave an unpaid order behind.
    if (newOrder && newOrder.paymentMethod !== "cod") await orderModel.deleteOne({ _id: newOrder._id, payment: false }).catch(() => {});
    res.json({ success: false, message: "We could not place your order. Please try again." });
  }
};

// "Thank you" page: confirms the order (and finishes Stripe payments)
const verifyOrder = async (req, res) => {
  try {
    const { orderId, success, session_id, userId } = req.body;
    const order = await orderModel.findById(orderId);
    if (!order || order.userId !== userId) return res.json({ success: false, message: "Order not found" });

    if (order.paymentMethod === "cod") return res.json({ success: true, message: "Order placed" });
    if (order.payment) return res.json({ success: true, message: "Payment successful" });

    if (order.paymentMethod === "stripe" && success === "true" && stripe && session_id && session_id === order.stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        await markPaid(order, session.payment_intent || session.id);
        return res.json({ success: true, message: "Payment successful" });
      }
    }
    // Not paid: remove the unpaid online order.
    await orderModel.deleteOne({ _id: orderId, userId, payment: false });
    res.json({ success: false, message: "Payment not completed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Razorpay: check the signature so a payment can't be faked from the browser
const verifyRazorpay = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;
    const order = await orderModel.findById(orderId);
    if (!razorpay || !order || order.userId !== userId || order.razorpayOrderId !== razorpay_order_id) {
      return res.json({ success: false, message: "Order not found" });
    }
    const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const given = String(razorpay_signature || "");
    const valid = given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!valid) return res.json({ success: false, message: "Payment could not be verified" });
    await markPaid(order, razorpay_payment_id, { razorpayPaymentId: razorpay_payment_id });
    res.json({ success: true, message: "Payment successful" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Customer closed the payment window or it failed: remove the unpaid order
const cancelOnlineOrder = async (req, res) => {
  try {
    await orderModel.deleteOne({ _id: req.body.orderId, userId: req.body.userId, paymentMethod: { $ne: "cod" }, payment: false });
    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// invoice HTML for the logged-in customer's own order
const getInvoice = async (req, res) => {
  try {
    const order = await orderModel.findById(req.body.orderId);
    if (!order || order.userId !== req.body.userId) return res.json({ success: false, message: "Order not found" });
    res.json({ success: true, html: invoiceHtml(order) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// ---- admin ----
const listOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({}).sort({ date: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// live status dispatcher. Cash orders become paid (and the receipt is emailed) when delivered.
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!STATUSES.includes(status)) return res.json({ success: false, message: "Unknown status" });
    const order = await orderModel.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });
    if (order.status === status) return res.json({ success: true, message: "Status Updated" });
    const update = { status, statusHistory: [...(order.statusHistory || []), { status, at: new Date() }] };
    const becamePaid = status === "Delivered" && !order.payment && order.paymentMethod === "cod";
    if (becamePaid) update.payment = true;
    const updated = await orderModel.findByIdAndUpdate(orderId, update, { new: true });
    if (becamePaid) await emailReceipt(updated);
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const adminInvoice = async (req, res) => {
  try {
    const order = await orderModel.findById(req.body.orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });
    res.json({ success: true, html: invoiceHtml(order) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const resendInvoice = async (req, res) => {
  try {
    const order = await orderModel.findById(req.body.orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });
    const r = await emailReceipt(order, true);
    res.json({ success: r.sent, message: r.sent ? `Receipt emailed to ${order.address.email}` : r.reason });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

export {
  placeOrder, verifyOrder, userOrders, listOrders, updateStatus, paymentConfig, checkCoupon,
  verifyRazorpay, cancelOnlineOrder, getInvoice, adminInvoice, resendInvoice,
};
