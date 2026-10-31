import foodModel from "../models/foodModel.js";
import fs from "fs";

const CATEGORIES = ["Salad", "Rolls", "Deserts", "Sandwich", "Cake", "Pure Veg", "Pasta", "Noodles"];

// add food item
const addFood = async (req, res) => {
  const name = (req.body.name || "").trim();
  const description = (req.body.description || "").trim();
  const price = Number(req.body.price);
  const category = req.body.category;
  const dropFile = () => req.file && fs.unlink(`uploads/${req.file.filename}`, () => {});

  if (!req.file) return res.json({ success: false, message: "Upload a PNG, JPG or WebP image (max 5 MB)" });
  if (name.length < 2) { dropFile(); return res.json({ success: false, message: "Enter the dish name" }); }
  if (description.length < 5) { dropFile(); return res.json({ success: false, message: "Enter a short description" }); }
  if (!Number.isFinite(price) || price < 1 || price > 100000) { dropFile(); return res.json({ success: false, message: "Enter a price in rupees, for example 250" }); }
  if (!CATEGORIES.includes(category)) { dropFile(); return res.json({ success: false, message: "Choose a category" }); }

  try {
    await new foodModel({ name, description, price: Math.round(price), category, veg: req.body.veg !== "false", image: req.file.filename }).save();
    res.json({ success: true, message: "Dish added" });
  } catch (error) {
    console.log(error);
    dropFile();
    res.json({ success: false, message: "Could not add the dish" });
  }
};

// all food list
const listFood = async (req, res) => {
  try {
    const foods = await foodModel.find({});
    res.json({ success: true, data: foods });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// remove food item
const removeFood = async (req, res) => {
  try {
    const food = await foodModel.findById(req.body.id);
    if (!food) return res.json({ success: false, message: "Dish not found" });
    await foodModel.findByIdAndDelete(req.body.id);
    // Seeded dishes share bundled image files, so only delete the picture if no other dish uses it.
    if (!(await foodModel.exists({ image: food.image })) && !/^food_\d+\.png$/.test(food.image)) {
      fs.unlink(`uploads/${food.image}`, () => {});
    }
    res.json({ success: true, message: "Dish removed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Could not remove the dish" });
  }
};

// edit a dish (image is optional: keep the old one if no new file is sent)
const updateFood = async (req, res) => {
  const dropFile = () => req.file && fs.unlink(`uploads/${req.file.filename}`, () => {});
  try {
    const food = await foodModel.findById(req.body.id);
    if (!food) { dropFile(); return res.json({ success: false, message: "Dish not found" }); }
    const name = (req.body.name ?? food.name).trim();
    const description = (req.body.description ?? food.description).trim();
    const price = Number(req.body.price ?? food.price);
    const category = req.body.category ?? food.category;
    if (name.length < 2) { dropFile(); return res.json({ success: false, message: "Enter the dish name" }); }
    if (description.length < 5) { dropFile(); return res.json({ success: false, message: "Enter a short description" }); }
    if (!Number.isFinite(price) || price < 1 || price > 100000) { dropFile(); return res.json({ success: false, message: "Enter a price in rupees, for example 250" }); }
    if (!CATEGORIES.includes(category)) { dropFile(); return res.json({ success: false, message: "Choose a category" }); }
    const oldImage = food.image;
    const update = { name, description, price: Math.round(price), category };
    if (req.body.veg !== undefined) update.veg = req.body.veg !== "false";
    if (req.file) update.image = req.file.filename;
    await foodModel.findByIdAndUpdate(food._id, update);
    if (req.file && !/^food_\d+\.png$/.test(oldImage) && !(await foodModel.exists({ image: oldImage }))) fs.unlink(`uploads/${oldImage}`, () => {});
    res.json({ success: true, message: "Dish updated" });
  } catch (error) {
    console.log(error);
    dropFile();
    res.json({ success: false, message: "Could not update the dish" });
  }
};

export { addFood, listFood, removeFood, updateFood, CATEGORIES };
