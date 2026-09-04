import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  try {
    await mongoose.connect(uri);
    console.log("MongoDB conectado");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }
}
