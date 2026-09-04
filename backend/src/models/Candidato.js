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
    },
    telefono: {
      type: String,
      trim: true,
    },
    cvUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Candidato", candidatoSchema);
