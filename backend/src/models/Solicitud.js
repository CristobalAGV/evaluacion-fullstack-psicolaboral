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
    // Ruta antigua del CV en disco (datos previos a guardar archivos en MongoDB). Los CV nuevos
    // se referencian desde Candidato.cvArchivoId.
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
    // Las postulaciones públicas llegan sin evaluador; el analista lo asigna después.
    profesionalResponsable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },
    estado: {
      type: String,
      enum: ["Pendiente", "En proceso", "Finalizada"],
      default: "Pendiente",
    },
    // Vacío cuando la solicitud la creó el propio candidato desde /postular.
    analistaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Solicitud", solicitudSchema);
