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
    // CV e informe de entrevista guardados en MongoDB (modelo Archivo).
    cvArchivoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Archivo",
      default: null,
    },
    informeArchivoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Archivo",
      default: null,
    },
    // Rutas antiguas en el disco del servidor (antes de guardar los archivos en MongoDB). Se
    // conservan solo para avisar "Archivo no disponible": esos archivos ya no existen.
    cvUrl: {
      type: String,
      default: "",
    },
    informeEntrevistaUrl: {
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
