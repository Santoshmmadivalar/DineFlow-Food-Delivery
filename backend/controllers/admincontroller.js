import jwt from "jsonwebtoken";
import crypto from "crypto";

const same = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

// admin login using ADMIN_EMAIL and ADMIN_PASSWORD from .env
const adminLogin = (req, res) => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.json({ success: false, message: "Admin login is not set up. Add ADMIN_EMAIL and ADMIN_PASSWORD to backend/.env" });
  }
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!same(email, ADMIN_EMAIL.trim().toLowerCase()) || !same(password, ADMIN_PASSWORD)) {
    return res.json({ success: false, message: "Wrong admin email or password" });
  }
  const secret = JWT_SECRET || "dineflow-jwt-super-secret-key-2025";
  res.json({ success: true, token: jwt.sign({ role: "admin" }, secret, { expiresIn: "12h" }) });
};

export { adminLogin };
