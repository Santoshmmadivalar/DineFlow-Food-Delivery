import jwt from "jsonwebtoken";

// Only requests carrying a valid admin token may pass.
const adminAuth = (req, res, next) => {
  const { token } = req.headers;
  if (!token) return res.json({ success: false, message: "Not Authorized Login Again" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") throw new Error("not admin");
    next();
  } catch {
    res.json({ success: false, message: "Not Authorized Login Again" });
  }
};

export default adminAuth;
