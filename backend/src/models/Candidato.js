import mongoose from "mongoose";

const candidatoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    correo: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Correo invalido"],
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\+?56\s?9\s?\d{4}\s?\d{4}$/,
        "Telefono invalido. Use formato de celular chileno: +56 9 1234 5678",
      ],
    },
    cvUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Candidato", candidatoSchema);
