import mongoose from "mongoose";
import { RESULTADOS, MAX_MENSAJE_ADICIONAL } from "../utils/datosSolicitud.js";

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
    // Resultado final del proceso, separado del estado: solo tiene sentido con estado "Finalizada".
    // Las solicitudes anteriores no lo tienen y quedan en null.
    resultado: {
      type: String,
      enum: RESULTADOS,
      default: null,
    },
    // Fecha y hora (instante en UTC) en que se evaluará al candidato. Opcional.
    fechaEvaluacion: {
      type: Date,
      default: null,
    },
    // Texto libre que el candidato puede dejar al postular desde /postular. Opcional.
    mensajeAdicional: {
      type: String,
      trim: true,
      maxlength: MAX_MENSAJE_ADICIONAL,
      default: "",
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
