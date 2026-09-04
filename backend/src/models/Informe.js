import mongoose from "mongoose";

const informeSchema = new mongoose.Schema(
  {
    solicitud: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Solicitud",
      required: true,
    },
    entrevista: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entrevista",
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
    contenido: {
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
