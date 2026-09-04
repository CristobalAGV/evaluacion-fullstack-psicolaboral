import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    correo: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    rol: {
      type: String,
      enum: ["analista", "psicologo", "admin"],
      required: true,
      default: "analista",
    },
  },
  { timestamps: true }
);

usuarioSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

usuarioSchema.methods.compararPassword = function compararPassword(passwordIngresada) {
  return bcrypt.compare(passwordIngresada, this.password);
};

export default mongoose.model("Usuario", usuarioSchema);
