import mongoose from "mongoose";

// Archivo subido (CV o informe de entrevista) guardado dentro de MongoDB. Se usa este modelo
// en vez del disco del servidor porque el disco de Render es efímero. Con el límite de 5 MB,
// cada documento queda muy por debajo del máximo de 16 MB de MongoDB, así que no hace falta GridFS.
const archivoSchema = new mongoose.Schema({
  nombreOriginal: {
    type: String,
    required: true,
    trim: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  tamano: {
    type: Number,
    required: true,
    max: 5 * 1024 * 1024,
  },
  tipo: {
    type: String,
    enum: ["cv", "informe"],
    required: true,
  },
  // No se trae en las consultas normales; solo al descargar.
  datos: {
    type: Buffer,
    required: true,
    select: false,
  },
  candidatoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidato",
    required: true,
    index: true,
  },
  // Vacío en las postulaciones públicas (las sube el propio candidato, sin cuenta).
  subidoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    default: null,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Archivo", archivoSchema);
