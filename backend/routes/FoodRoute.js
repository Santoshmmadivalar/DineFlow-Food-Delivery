import express from "express";
import multer from "multer"; // image storage
import { addFood, listFood, removeFood, updateFood, seedMenu } from "../controllers/foodcontroller.js";
import adminAuth from "../middleware/adminAuth.js";

const foodRouter = express.Router();

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => cb(null, `${Date.now()}${file.originalname.replace(/[^\w.\-]/g, "_")}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)),
});

// adding and removing dishes is admin only; the menu list is public
foodRouter.post("/add", adminAuth, upload.single("image"), addFood);
foodRouter.get("/list", listFood);
foodRouter.get("/seed", seedMenu);
foodRouter.post("/seed", seedMenu);
foodRouter.post("/remove", adminAuth, removeFood);
foodRouter.post("/update", adminAuth, upload.single("image"), updateFood);

export default foodRouter;
