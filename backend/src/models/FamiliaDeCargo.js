import mongoose from "mongoose";

const familiaDeCargoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    plantillaInforme: {
      type: String,
      default: "",
    },
    pautaEntrevista: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FamiliaDeCargo", familiaDeCargoSchema);
