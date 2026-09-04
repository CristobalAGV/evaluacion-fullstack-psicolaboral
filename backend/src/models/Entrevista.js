import mongoose from "mongoose";

const entrevistaSchema = new mongoose.Schema(
  {
    solicitud: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Solicitud",
      required: true,
    },
    candidato: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidato",
      required: true,
    },
    psicologoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    fecha: {
      type: Date,
      required: true,
    },
    estado: {
      type: String,
      enum: ["agendada", "realizada", "cancelada"],
      default: "agendada",
    },
    observaciones: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Entrevista", entrevistaSchema);
