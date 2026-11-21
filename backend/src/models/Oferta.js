import mongoose from "mongoose";

export const MODALIDADES = ["presencial", "híbrida", "remota"];
export const CAMPOS_OFERTA = {
  cargo: 100, ubicacion: 160, descripcion: 4000, funciones: 4000,
  requisitos: 4000, beneficios: 4000, sueldo: 160,
};
export const CAMPOS_PROFESIONALES = {
  area: 100, region: 100, objetivo: 4000, experiencia: 1000, estudios: 1000, conocimientos: 2000,
};

const schema = new mongoose.Schema({
  ...Object.fromEntries(Object.entries(CAMPOS_OFERTA).map(([campo, maxlength]) => [
    campo, { type: String, required: true, trim: true, maxlength },
  ])),
  ...Object.fromEntries(Object.entries(CAMPOS_PROFESIONALES).map(([campo, maxlength]) => [
    campo, { type: String, default: "", trim: true, maxlength },
  ])),
  familiaDeCargo: { type: mongoose.Schema.Types.ObjectId, ref: "FamiliaDeCargo", required: true },
  modalidad: { type: String, required: true, enum: MODALIDADES },
  cupos: { type: Number, required: true, min: 1, max: 10000, validate: Number.isInteger },
  estado: { type: String, enum: ["borrador", "publicada", "archivada"], default: "borrador" },
  fechaPublicacion: { type: Date, default: null },
}, { timestamps: true });

schema.index({ estado: 1, fechaPublicacion: -1 });
export default mongoose.model("Oferta", schema);
