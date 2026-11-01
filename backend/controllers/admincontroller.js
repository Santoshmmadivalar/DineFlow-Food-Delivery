import jwt from "jsonwebtoken";
import crypto from "crypto";

const same = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

// admin login using ADMIN_EMAIL and ADMIN_PASSWORD from .env (with safe defaults)
const adminLogin = (req, res) => {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@dineflow.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const secret = process.env.JWT_SECRET || "dineflow-jwt-super-secret-key-2025";

  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!same(email, adminEmail) || !same(password, adminPassword)) {
    return res.json({ success: false, message: "Wrong admin email or password" });
  }
  res.json({ success: true, token: jwt.sign({ role: "admin" }, secret, { expiresIn: "12h" }) });
};

export { adminLogin };
