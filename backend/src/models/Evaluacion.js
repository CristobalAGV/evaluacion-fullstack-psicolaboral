import mongoose from "mongoose";

const evaluacionSchema = new mongoose.Schema(
  {
    solicitud: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Solicitud",
      required: true,
    },
    fechaEvaluacion: {
      type: Date,
      default: Date.now,
    },
    resultado: {
      type: String,
      default: "",
    },
    estado: {
      type: String,
      enum: ["Pendiente", "En proceso", "Finalizada"],
      default: "Pendiente",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Evaluacion", evaluacionSchema);
