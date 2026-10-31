// End-to-end test of the real API. Needs a MongoDB (or compatible) database and these in backend/.env:
//   MONGODB_URI, JWT_SECRET, ADMIN_EMAIL=admin@dineflow.com, ADMIN_PASSWORD=admin123, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
//   STRIPE_SECRET_KEY (any fake values), SMTP_HOST=127.0.0.1, SMTP_PORT=2525. Seed the menu first (npm run seed).
// It starts a fake mail server on port 2525 and the API on port 4000, then checks sign up, login, cart, orders,
// payments, receipt emails, admin protection and menu add/edit/delete. Run it against a throwaway database.
import { spawn } from "child_process";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import crypto from "crypto";
import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "../config/db.js";
import orderModel from "../models/ordermodel.js";
import foodModel from "../models/foodModel.js";
import userModel from "../models/UserModel.js";

await connectDB();
// start clean so the test can be run again and again
await userModel.deleteMany({ email: { $in: ["asha@test.in", "ravi@test.in"] } });
await orderModel.deleteMany({ "address.email": "asha@test.in" });
await foodModel.deleteMany({ name: { $in: ["Butter Chicken", "Butter Chicken Special", "Butter Paneer"] } });
const mails = [];
const smtp = new SMTPServer({ authOptional: true, disabledCommands: ["STARTTLS", "AUTH"], onData(stream, s, cb) { simpleParser(stream).then(m => { mails.push(m); cb(); }).catch(cb); } });
await new Promise(r => smtp.listen(2525, "127.0.0.1", r));
const srv = spawn("node", ["server.js"], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
let srvlog = ""; srv.stdout.on("data", d => srvlog += d); srv.stderr.on("data", d => srvlog += d);
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { await fetch("http://127.0.0.1:4000/api/food/list"); break; } catch { await sleep(250); } }
const B = "http://127.0.0.1:4000";
const post = async (path, body, token, raw) => (await fetch(B + path, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { token } : {}) }, body: JSON.stringify(body || {}) })).json();
const get = async (path, token) => (await fetch(B + path, { headers: token ? { token } : {} })).json();
let pass = 0, fail = 0;
const t = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  -> " + extra : "")); };

// ---- menu
let r = await get("/api/food/list");
t("menu lists 32 dishes with veg flags", r.success && r.data.length === 32 && r.data.filter(f => f.veg === false).length === 4, r.data.length + " dishes");
const foods = r.data; const salad = foods.find(f => f.name === "Greek salad"), pasta = foods.find(f => f.name === "Cheese Pasta");
// ---- auth
r = await post("/api/user/register", { name: "A", email: "x@y.in", password: "password1" }); t("register: short name rejected", !r.success, r.message);
r = await post("/api/user/register", { name: "Asha Rao", email: "bad-email", password: "password1" }); t("register: bad email rejected", !r.success, r.message);
r = await post("/api/user/register", { name: "Asha Rao", email: "asha@test.in", password: "short" }); t("register: short password rejected", !r.success, r.message);
r = await post("/api/user/register", { name: "Asha Rao", email: "Asha@Test.in", password: "password1" }); t("register: success returns token + name", r.success && r.token && r.name === "Asha Rao");
const tok = r.token;
r = await post("/api/user/register", { name: "Asha Again", email: "asha@test.in", password: "password1" }); t("register: duplicate email rejected (case-insensitive)", !r.success, r.message);
r = await post("/api/user/login", { email: "nobody@test.in", password: "password1" }); t("login: unknown email", !r.success && /No account/.test(r.message), r.message);
r = await post("/api/user/login", { email: "asha@test.in", password: "wrongpass1" }); t("login: wrong password", !r.success && /Incorrect/.test(r.message), r.message);
r = await post("/api/user/login", { email: " ASHA@test.in ", password: "password1" }); t("login: success (email trimmed/lowercased)", r.success && r.token && r.name === "Asha Rao");
const tok2 = r.token;
r = await post("/api/user/register", { name: "Ravi K", email: "ravi@test.in", password: "password1" }); const tokB = r.token;
r = await post("/api/cart/get", {}, "garbage"); t("cart: bad token rejected", !r.success && /Not Authorized/.test(r.message), r.message);
r = await post("/api/cart/get", {}); t("cart: no token rejected", !r.success);
// ---- cart
await post("/api/cart/add", { itemId: salad._id }, tok2); await post("/api/cart/add", { itemId: salad._id }, tok2); await post("/api/cart/add", { itemId: pasta._id }, tok2);
r = await post("/api/cart/get", {}, tok2); t("cart: add/get keeps quantities", r.success && r.cartData[salad._id] === 2 && r.cartData[pasta._id] === 1, JSON.stringify(r.cartData).slice(0, 80));
await post("/api/cart/remove", { itemId: pasta._id }, tok2); r = await post("/api/cart/get", {}, tok2); t("cart: remove works", !r.cartData[pasta._id]);
// ---- config + coupon
r = await get("/api/order/config"); t("config: razorpay + stripe available", r.razorpay === true && r.stripe === true);
r = await post("/api/order/coupon", { code: "welcome10", subtotal: 500 }); t("coupon WELCOME10 on ₹500", r.valid && r.discount === 50, r.message);
r = await post("/api/order/coupon", { code: "FLAT50", subtotal: 200 }); t("coupon FLAT50 under minimum", !r.valid, r.message);
// ---- orders
const addr = { firstName: "Asha", lastName: "Rao", email: "asha@test.in", street: "12 MG Road", city: "Bengaluru", state: "Karnataka", zipCode: "560001", phone: "9108497662" };
const items = [{ _id: salad._id, quantity: 2, note: "less spicy", price: 1 }, { _id: pasta._id, quantity: 1 }];
r = await post("/api/order/place", { items, address: { ...addr, phone: "12345" }, paymentMethod: "cod" }); t("order: bad phone rejected", !r.success, r.message);
r = await post("/api/order/place", { items, address: { ...addr, zipCode: "56" }, paymentMethod: "cod" }); t("order: bad PIN rejected", !r.success, r.message);
r = await post("/api/order/place", { items: [], address: addr, paymentMethod: "cod" }, tok2); t("order: empty cart rejected", !r.success, r.message);
r = await post("/api/order/place", { items, address: addr, paymentMethod: "cod" }); t("order: needs login", !r.success);
r = await post("/api/order/place", { items, address: addr, paymentMethod: "cod", coupon: "WELCOME10" }, tok2);
t("order: COD with coupon placed", r.success && r.orderId, JSON.stringify(r).slice(0, 80)); const cod1 = r.orderId;
let o = await orderModel.findById(cod1);
const sub = salad.price * 2 + pasta.price, fee = sub >= 599 ? 0 : 40, disc = Math.min(Math.floor(sub * 0.1), 100);
t("order: server priced it (ignored price:1), discount + fee correct", o.amount === sub + fee - disc && o.discount === disc && o.deliveryFee === fee, `amount ${o.amount} = ${sub}+${fee}-${disc}`);
t("order: note saved, history started", o.items[0].note === "less spicy" && o.statusHistory.length === 1);
r = await post("/api/order/verify", { orderId: cod1, success: "true" }, tok2); t("verify: COD order confirmed", r.success, r.message);
r = await post("/api/order/verify", { orderId: cod1, success: "true" }, tokB); t("verify: other user can't confirm", !r.success, r.message);
r = await post("/api/cart/get", {}, tok2); t("order: cart emptied after order", Object.keys(r.cartData).length === 0);
r = await post("/api/order/userorders", {}, tok2); t("my orders lists it", r.success && r.data.some(x => String(x._id) === cod1));
await sleep(400); t("no email for unpaid COD order yet", mails.length === 0, mails.length + " mails");
// ---- razorpay / stripe: providers unreachable here, must fail cleanly and leave nothing behind
const before = await orderModel.countDocuments({});
r = await post("/api/order/place", { items, address: addr, paymentMethod: "razorpay" }, tok2); t("razorpay: provider error handled cleanly", r.success === false, r.message);
r = await post("/api/order/place", { items, address: addr, paymentMethod: "stripe" }, tok2); t("stripe: provider error handled cleanly", r.success === false, r.message);
t("no unpaid online orders left behind", (await orderModel.countDocuments({})) === before);
// razorpay signature verify path (order created directly, as Razorpay would have)
const uid = (await post("/api/order/userorders", {}, tok2)).data[0].userId;
const rz = await new orderModel({ userId: uid, items: [{ name: "Cheese Pasta", price: 240, quantity: 1 }], amount: 280, deliveryFee: 40, address: addr, paymentMethod: "razorpay", razorpayOrderId: "order_TEST1", statusHistory: [{ status: "Food Processing", at: new Date() }] }).save();
r = await post("/api/order/razorpay/verify", { orderId: String(rz._id), razorpay_order_id: "order_TEST1", razorpay_payment_id: "pay_TEST1", razorpay_signature: "0".repeat(64) }, tok2); t("razorpay: bad signature rejected", !r.success, r.message);
t("razorpay: still unpaid, no email", (await orderModel.findById(rz._id)).payment === false && mails.length === 0);
const sig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update("order_TEST1|pay_TEST1").digest("hex");
r = await post("/api/order/razorpay/verify", { orderId: String(rz._id), razorpay_order_id: "order_TEST1", razorpay_payment_id: "pay_TEST1", razorpay_signature: sig }, tokB); t("razorpay: other user can't verify", !r.success, r.message);
r = await post("/api/order/razorpay/verify", { orderId: String(rz._id), razorpay_order_id: "order_TEST1", razorpay_payment_id: "pay_TEST1", razorpay_signature: sig }, tok2); t("razorpay: valid signature -> paid", r.success, r.message);
await sleep(800);
o = await orderModel.findById(rz._id); t("razorpay: order marked paid with payment id", o.payment === true && o.paymentId === "pay_TEST1");
t("receipt email delivered over SMTP", mails.length === 1 && mails[0].to.text === "asha@test.in", mails[0] && mails[0].subject);
const html = mails[0]?.html || ""; t("receipt has totals, payment id, address, PAID", ["PAID", "pay_TEST1", "12 MG Road", "₹280", "Razorpay"].every(x => html.includes(x)));
r = await post("/api/order/razorpay/verify", { orderId: String(rz._id), razorpay_order_id: "order_TEST1", razorpay_payment_id: "pay_TEST1", razorpay_signature: sig }, tok2); await sleep(300); t("no duplicate email on repeat verify", mails.length === 1, mails.length + " mails");
const un = await new orderModel({ userId: uid, items: [], amount: 100, address: addr, paymentMethod: "stripe" }).save();
r = await post("/api/order/razorpay/cancel", { orderId: String(un._id) }, tok2); t("cancel removes unpaid online order", r.success && !(await orderModel.findById(un._id)));
r = await post("/api/order/razorpay/cancel", { orderId: String(rz._id) }, tok2); t("cancel never removes a paid order", !!(await orderModel.findById(rz._id)));
// ---- customer invoice
r = await post("/api/order/invoice", { orderId: String(rz._id) }, tok2); t("customer can open own receipt", r.success && r.html.includes("<!DOCTYPE"));
r = await post("/api/order/invoice", { orderId: String(rz._id) }, tokB); t("customer can't open someone else's", !r.success, r.message);
// ---- admin auth
r = await post("/api/admin/login", { email: "admin@dineflow.com", password: "nope" }); t("admin: wrong password", !r.success, r.message);
r = await post("/api/admin/login", { email: " Admin@dineflow.com ", password: "admin123" }); t("admin: login ok", r.success && r.token);
const adm = r.token;
r = await get("/api/order/list"); t("admin API: no token blocked", !r.success, r.message);
r = await get("/api/order/list", tok2); t("admin API: customer token blocked", !r.success, r.message);
r = await get("/api/order/list", adm); t("admin API: order list works", r.success && r.data.length >= 2, r.data && r.data.length + " orders");
r = await post("/api/order/status", { orderId: cod1, status: "Out for delivery" }); t("status change needs admin", !r.success);
r = await post("/api/order/status", { orderId: cod1, status: "Teleported" }, adm); t("unknown status rejected", !r.success, r.message);
r = await post("/api/order/status", { orderId: cod1, status: "Out for delivery" }, adm); t("status -> Out for delivery", r.success);
const n0 = mails.length;
r = await post("/api/order/status", { orderId: cod1, status: "Delivered" }, adm); await sleep(800);
o = await orderModel.findById(cod1); t("COD Delivered -> paid, 3-step history", o.payment === true && o.statusHistory.map(h => h.status).join() === "Food Processing,Out for delivery,Delivered");
t("COD delivered -> receipt emailed", mails.length === n0 + 1 && mails[mails.length - 1].html.includes("less spicy") && mails[mails.length - 1].html.includes("WELCOME10"), mails[mails.length - 1]?.subject);
r = await post("/api/order/admin/resend", { orderId: String(rz._id) }, adm); await sleep(600); t("admin can email receipt again", r.success && mails.length === n0 + 2, r.message);
r = await post("/api/order/admin/invoice", { orderId: cod1 }, adm); t("admin can view invoice html", r.success && r.html.includes("DF-"));
// ---- menu CRUD (multipart)
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fd = (o2, file = true, type = "image/png", fname = "dish.png") => { const f = new FormData(); for (const k in o2) f.append(k, o2[k]); if (file) f.append("image", new Blob([png], { type }), fname); return f; };
const send = async (path, form, token) => (await fetch(B + path, { method: "POST", headers: token ? { token } : {}, body: form })).json();
const dish = { name: "Butter Chicken", description: "Creamy tomato gravy with chicken", price: "520", category: "Pure Veg", veg: "false" };
r = await send("/api/food/add", fd(dish)); t("add dish: needs admin", !r.success, r.message);
r = await send("/api/food/add", fd(dish), tok2); t("add dish: customer token blocked", !r.success);
r = await send("/api/food/add", fd(dish, false), adm); t("add dish: image required", !r.success, r.message);
r = await send("/api/food/add", fd(dish, true, "text/plain", "x.txt"), adm); t("add dish: non-image rejected", !r.success, r.message);
r = await send("/api/food/add", fd({ ...dish, price: "0" }), adm); t("add dish: bad price rejected", !r.success, r.message);
r = await send("/api/food/add", fd({ ...dish, category: "Pizza" }), adm); t("add dish: bad category rejected", !r.success, r.message);
r = await send("/api/food/add", fd(dish), adm); t("add dish: success", r.success, r.message);
let list = (await get("/api/food/list")).data; const bc = list.find(f => f.name === "Butter Chicken");
t("new dish listed, non-veg, image stored", bc && bc.veg === false && bc.price === 520 && bc.image.endsWith("dish.png"));
r = await get("/images/" + bc.image).then(x => x, () => null); 
const imgRes = await fetch(B + "/images/" + bc.image); t("dish image is served", imgRes.status === 200 && (imgRes.headers.get("content-type") || "").includes("image"));
r = await send("/api/food/update", fd({ id: bc._id, name: "Butter Chicken Special", description: bc.description, price: "560", category: "Pure Veg", veg: "false" }, false), adm); t("edit dish: success without new image", r.success, r.message);
r = await send("/api/food/update", fd({ id: bc._id, name: "Butter Paneer", description: "Creamy tomato gravy with paneer", price: "480", category: "Pure Veg", veg: "true" }), adm);
list = (await get("/api/food/list")).data; const bp = list.find(f => f._id === bc._id);
t("edit dish: new image + veg flag updated", r.success && bp.name === "Butter Paneer" && bp.veg === true && bp.price === 480 && bp.image !== bc.image);
r = await send("/api/food/update", fd({ id: bc._id, price: "-5" }, false), adm); t("edit dish: bad price rejected", !r.success, r.message);
r = await post("/api/food/remove", { id: bc._id }); t("delete dish: needs admin", !r.success);
r = await post("/api/food/remove", { id: bc._id }, adm); t("delete dish: success", r.success, r.message);
t("deleted dish gone from menu", !(await get("/api/food/list")).data.some(f => f._id === bc._id));
r = await post("/api/food/remove", { id: bc._id }, adm); t("delete dish twice -> clean error", !r.success, r.message);
// ---- ordering a deleted dish
r = await post("/api/order/place", { items: [{ _id: bc._id, quantity: 1 }], address: addr, paymentMethod: "cod" }, tok2); t("ordering a deleted dish is refused", !r.success, r.message);
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) console.log("--- server log ---\n" + srvlog.slice(-1500));
srv.kill(); smtp.close(); await mongoose.disconnect().catch(() => {}); process.exit(fail ? 1 : 0);
