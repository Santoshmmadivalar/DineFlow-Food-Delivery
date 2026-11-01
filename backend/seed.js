import fs from "fs";
import mongoose from "mongoose";
import "dotenv/config";
import foodModel from "./models/foodModel.js";

const seed = async () => {
  try {
    // Read URI from command line argument (e.g. node seed.js "mongodb+srv://...") or environment
    const cliArgUri = process.argv.slice(2).find((arg) => arg.startsWith("mongodb://") || arg.startsWith("mongodb+srv://"));
    const uri = cliArgUri || process.env.MONGODB_URI;

    if (!uri) {
      console.error("MONGODB_URI is not set. You can pass it as an argument:\n  node seed.js \"mongodb+srv://...\"\nor set MONGODB_URI in backend/.env");
      process.exit(1);
    }

    console.log("Connecting to MongoDB database...");
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully.");

    const seedFile = new URL("./seed-data/foods.json", import.meta.url);
    const foods = JSON.parse(fs.readFileSync(seedFile, "utf-8"));

    const existingCount = await foodModel.countDocuments();
    const shouldClean = process.argv.includes("--clean");

    if (shouldClean) {
      console.log(`--clean flag detected. Removing ${existingCount} existing food items...`);
      await foodModel.deleteMany({});
      await foodModel.insertMany(foods);
      console.log(`Clean seed completed. Inserted ${foods.length} food items.`);
    } else {
      console.log(`Current items in database: ${existingCount}. Performing safe upsert...`);
      let inserted = 0;
      for (const food of foods) {
        const result = await foodModel.updateOne(
          { name: food.name },
          { $setOnInsert: food },
          { upsert: true }
        );
        if (result.upsertedCount > 0) inserted++;
      }
      const finalCount = await foodModel.countDocuments();
      console.log(`Safe seed completed: ${inserted} new items added, ${existingCount} existing items preserved. Total items in database: ${finalCount}.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding DB:", error);
    process.exit(1);
  }
};

seed();
