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
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Correo inválido"],
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\+?56\s?9\s?\d{4}\s?\d{4}$/,
        "Teléfono inválido. Usa el formato de celular chileno: +56 9 1234 5678",
      ],
    },
    cvUrl: {
      type: String,
      default: "",
    },
    // Por dónde llegó el candidato: cargado por un analista o desde el formulario público /postular.
    origen: {
      type: String,
      enum: ["analista", "postulacion_publica"],
      default: "analista",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Candidato", candidatoSchema);
