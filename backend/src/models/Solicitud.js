import mongoose from "mongoose";

const puntaje = { type: Number, min: 0, max: 100 };

// Evaluación de apoyo generada con IA (nota y retroalimentación). Solo se guarda cuando el
// evaluador confirma el borrador. Una competencia sin evidencia queda con puntaje null.
const evaluacionIaSchema = new mongoose.Schema(
  {
    puntajeGlobal: { ...puntaje, required: true },
    competencias: [
      new mongoose.Schema(
        {
          nombre: { type: String, required: true },
          puntaje: { ...puntaje, default: null },
          justificacion: { type: String, default: "" },
        },
        { _id: false }
      ),
    ],
    fortalezas: { type: [String], default: [] },
    areasDeMejora: { type: [String], default: [] },
    recomendaciones: { type: [String], default: [] },
    resumen: { type: String, default: "" },
    modeloIa: { type: String, default: "" },
    generadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    generadoEn: { type: Date, default: Date.now },
  },
  { _id: false }
);

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
    evaluacionIa: {
      type: evaluacionIaSchema,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Solicitud", solicitudSchema);
