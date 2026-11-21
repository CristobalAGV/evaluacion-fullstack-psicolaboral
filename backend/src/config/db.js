import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado");
  } catch {
    console.error("No se pudo conectar a MongoDB. Revisa MONGO_URI y el acceso a la base.");
    process.exit(1);
  }
}
