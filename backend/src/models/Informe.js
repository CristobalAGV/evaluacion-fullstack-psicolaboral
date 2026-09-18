import mongoose from "mongoose";

const seccionSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    contenido: { type: String, default: "" },
  },
  { _id: false }
);

const informeSchema = new mongoose.Schema(
  {
    solicitud: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Solicitud",
      required: true,
      unique: true,
    },
    candidato: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidato",
      required: true,
    },
    // Secciones del informe, segun la estructura de la familia de cargo.
    secciones: {
      type: [seccionSchema],
      default: [],
    },
    // Apuntes de la entrevista con los que se genero el borrador. Se guardan
    // para poder volver a generarlo sin reescribirlos.
    apuntes: {
      type: String,
      default: "",
    },
    // Ultimas indicaciones de estilo que el evaluador le dio a la IA, para no
    // tener que reescribirlas al volver a generar el borrador.
    instrucciones: {
      type: String,
      default: "",
    },
    generadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    generadoEn: {
      type: Date,
      default: Date.now,
    },
    // Modelo de IA que produjo el borrador, para poder trazar el origen.
    modeloIa: {
      type: String,
      default: "",
    },
    estado: {
      type: String,
      enum: ["borrador", "finalizado"],
      default: "borrador",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Informe", informeSchema);
