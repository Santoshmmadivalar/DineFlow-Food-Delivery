import nodemailer from "nodemailer";

const STORE = {
  name: "DineFlow",
  email: process.env.STORE_EMAIL || "dineflow00@gmail.com",
  phone: process.env.STORE_PHONE || "9108497662",
  address: process.env.STORE_ADDRESS || "Bengaluru",
};

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const when = (d) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
const METHOD = { cod: "Cash on delivery", razorpay: "Razorpay (UPI / card / netbanking)", stripe: "Card via Stripe" };

export const invoiceNumber = (order) => "DF-" + String(order._id).slice(-8).toUpperCase();

// Builds the receipt as table-based HTML with inline styles so it looks right in email apps.
export const invoiceHtml = (order) => {
  const a = order.address || {};
  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const paid = Boolean(order.payment);
  const rows = items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid #eee">${esc(i.name)}${i.note ? `<br><span style="color:#777;font-size:12px">Note: ${esc(i.note)}</span>` : ""}</td>
<td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
<td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">${inr(i.price)}</td>
<td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${inr(i.price * i.quantity)}</td></tr>`
    )
    .join("");
  const line = (l, v, bold) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:700;font-size:18px;border-top:2px solid #222;padding-top:10px" : "color:#555"}">${l}</td><td style="padding:4px 0;text-align:right;${bold ? "font-weight:700;font-size:18px;border-top:2px solid #222;padding-top:10px" : ""}">${v}</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Invoice ${invoiceNumber(order)}</title></head>
<body style="margin:0;background:#f4f1ee;font-family:Arial,Helvetica,sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ee;padding:24px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#d4351c;color:#fff;padding:24px 28px"><div style="font-size:26px;font-weight:700">${STORE.name}</div><div style="opacity:.9;margin-top:2px">Fresh food, delivered fast</div></td></tr>
<tr><td style="padding:26px 28px">
<table width="100%"><tr><td><div style="font-size:20px;font-weight:700">${paid ? "Payment received. Thank you!" : "Order confirmed"}</div>
<div style="color:#666;margin-top:4px">Hi ${esc(a.firstName)}, here is your ${paid ? "receipt" : "order summary"}.</div></td>
<td align="right" style="vertical-align:top"><span style="display:inline-block;padding:5px 12px;border-radius:99px;font-size:12px;font-weight:700;background:${paid ? "#e6f6ec" : "#fff4e0"};color:${paid ? "#1a7f3c" : "#a35f00"}">${paid ? "PAID" : "PAYMENT DUE"}</span></td></tr></table>
<table width="100%" style="margin:18px 0;font-size:14px"><tr><td style="color:#777">Invoice no.</td><td align="right"><b>${invoiceNumber(order)}</b></td></tr>
<tr><td style="color:#777">Date</td><td align="right">${when(order.date)}</td></tr>
<tr><td style="color:#777">Payment</td><td align="right">${esc(METHOD[order.paymentMethod] || order.paymentMethod)}</td></tr>
${order.paymentId ? `<tr><td style="color:#777">Payment ID</td><td align="right">${esc(order.paymentId)}</td></tr>` : ""}</table>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px"><tr style="color:#777;font-size:12px;text-transform:uppercase"><td style="padding-bottom:6px">Item</td><td align="center" style="padding-bottom:6px">Qty</td><td align="right" style="padding-bottom:6px">Rate</td><td align="right" style="padding-bottom:6px">Amount</td></tr>${rows}</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px">
${line("Subtotal", inr(subtotal))}${line("Delivery fee", order.deliveryFee ? inr(order.deliveryFee) : "Free")}${order.discount ? line(`Discount${order.coupon ? " (" + esc(order.coupon) + ")" : ""}`, "−" + inr(order.discount)) : ""}${line("Total", inr(order.amount), true)}</table>
<div style="margin-top:22px;font-size:14px"><div style="color:#777;font-size:12px;text-transform:uppercase">Delivering to</div>
<div style="margin-top:4px;line-height:1.5">${esc(a.firstName)} ${esc(a.lastName)}<br>${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.zipCode)}<br>Phone: ${esc(a.phone)}</div></div>
</td></tr>
<tr><td style="background:#faf8f6;padding:18px 28px;color:#777;font-size:12px;line-height:1.6">Questions about your order? Email ${esc(STORE.email)} or call ${esc(STORE.phone)}.<br>${esc(STORE.name)}, ${esc(STORE.address)}</td></tr>
</table></td></tr></table></body></html>`;
};

let transporter;
const getTransporter = () => {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  transporter = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
};

// Lets tests plug in a fake mail transport.
export const setTransporter = (t) => { transporter = t; };

// Emails the receipt to the address entered at checkout. Never throws: a mail problem must not break an order.
export const sendInvoice = async (order) => {
  const to = order.address?.email;
  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email is not set up (add SMTP settings to backend/.env)" };
  if (!to) return { sent: false, reason: "No email address on the order" };
  try {
    const paid = Boolean(order.payment);
    await t.sendMail({
      from: process.env.MAIL_FROM || `"${STORE.name}" <${STORE.email}>`,
      to,
      subject: `${paid ? "Your DineFlow receipt" : "Your DineFlow order"} ${invoiceNumber(order)} (${inr(order.amount)})`,
      html: invoiceHtml(order),
    });
    return { sent: true };
  } catch (error) {
    console.log("Invoice email failed:", error.message);
    return { sent: false, reason: "The email could not be sent" };
  }
};
