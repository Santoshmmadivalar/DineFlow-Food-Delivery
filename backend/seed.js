import fs from "fs";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import foodModel from "./models/foodModel.js";

const seed = async () => {
  try {
    await connectDB();
    const foods = JSON.parse(fs.readFileSync("./seed-data/foods.json", "utf-8"));
    await foodModel.deleteMany({});
    await foodModel.insertMany(foods);
    console.log(`Inserted ${foods.length} food items.`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding DB:", error);
    process.exit(1);
  }
};

seed();
