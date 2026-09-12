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
    carpetaCandidato: {
      type: String,
      default: "",
    },
    observaciones: {
      type: String,
      default: "",
    },
    profesionalResponsable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    estado: {
      type: String,
      enum: ["Pendiente", "En proceso", "Finalizada"],
      default: "Pendiente",
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
