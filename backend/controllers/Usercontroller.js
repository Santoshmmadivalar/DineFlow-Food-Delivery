import userModel from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const clean = (v) => (typeof v === "string" ? v.trim() : "");

// login user
const loginUser = async (req, res) => {
  const email = clean(req.body.email).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  try {
    if (!email || !password) {
      return res.json({ success: false, message: "Enter your email and password" });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "No account found with this email" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password" });
    }
    res.json({ success: true, token: createToken(user._id), name: user.name });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// register user
const registerUser = async (req, res) => {
  const name = clean(req.body.name);
  const email = clean(req.body.email).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  try {
    if (name.length < 2) {
      return res.json({ success: false, message: "Enter your name" });
    }
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter a valid email" });
    }
    if (password.length < 8) {
      return res.json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (await userModel.findOne({ email })) {
      return res.json({ success: false, message: "An account with this email already exists. Please log in." });
    }
    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const user = await new userModel({ name, email, password: hashed }).save();
    res.json({ success: true, token: createToken(user._id), name: user.name });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong. Please try again." });
  }
};

export { loginUser, registerUser };
