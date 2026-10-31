// Coupon codes customers can use in the cart. Edit this list to add your own.
export const COUPONS = {
  WELCOME10: { type: "percent", value: 10, max: 100, min: 199, label: "10% off (up to ₹100) on orders above ₹199" },
  FLAT50: { type: "flat", value: 50, min: 399, label: "₹50 off orders above ₹399" },
  FREEDEL: { type: "delivery", min: 0, label: "Free delivery" },
};

// Returns { valid, discount, label, message }. Discount is in rupees and is taken off the order total.
export const applyCoupon = (code, subtotal, deliveryFee) => {
  const key = typeof code === "string" ? code.trim().toUpperCase() : "";
  const c = COUPONS[key];
  if (!key) return { valid: false, discount: 0, message: "Enter a coupon code" };
  if (!c) return { valid: false, discount: 0, message: "This coupon code is not valid" };
  if (subtotal < c.min) return { valid: false, discount: 0, message: `Add items worth ₹${c.min - subtotal} more to use ${key}` };
  let discount = 0;
  if (c.type === "percent") discount = Math.min(Math.floor((subtotal * c.value) / 100), c.max);
  if (c.type === "flat") discount = c.value;
  if (c.type === "delivery") discount = deliveryFee;
  if (discount <= 0) return { valid: false, discount: 0, message: "This coupon doesn't apply to your order" };
  return { valid: true, code: key, discount, label: c.label, message: `${key} applied. You save ₹${discount}` };
};
