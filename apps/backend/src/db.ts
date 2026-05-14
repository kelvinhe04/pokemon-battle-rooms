import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pokemon_battle_rooms";

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(MONGO_URI);
  console.log("✓ MongoDB connected:", MONGO_URI);
  return mongoose.connection;
}
