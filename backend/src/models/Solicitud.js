import mongoose from "mongoose";

const solicitudSchema = new mongoose.Schema(
  {
    candidato: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidato",
      required: true,
    },
    familiaDeCargo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamiliaDeCargo",
      required: true,
    },
    cargo: {
      type: String,
      required: true,
      trim: true,
    },
    cvUrl: {
      type: String,
      default: "",
    },
    estado: {
      type: String,
      enum: ["pendiente", "en_proceso", "entrevista_agendada", "finalizada", "cancelada"],
      default: "pendiente",
    },
    analistaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Solicitud", solicitudSchema);
