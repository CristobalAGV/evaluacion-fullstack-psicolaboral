import "dotenv/config";

import { connectDB } from "../config/db.js";
import Usuario from "../models/Usuario.js";
import mongoose from "mongoose";

// Contraseña común para todas las cuentas de demostración.
const PASSWORD = process.env.SEED_PASSWORD;

const USUARIOS = [
  { nombre: "Daniela Soto", correo: "daniela.soto@ejemplo.cl", rol: "analista" },
  { nombre: "Matías Rojas", correo: "matias.rojas@ejemplo.cl", rol: "evaluador" },
  { nombre: "Carolina Díaz", correo: "carolina.diaz@ejemplo.cl", rol: "evaluador" },
  { nombre: "Paula Vera", correo: "paula.vera@ejemplo.cl", rol: "admin" },
];

async function seed() {
  if (!PASSWORD?.trim()) {
    console.error("Configura SEED_PASSWORD para las cuentas ficticias antes de ejecutar este comando.");
    process.exitCode = 1;
    return;
  }
  await connectDB();

  for (const datos of USUARIOS) {
    // Se busca por correo y se actualiza el documento existente en vez de
    // recrearlo, para conservar su _id y no romper las solicitudes que lo
    // referencian como analista o profesional responsable.
    let usuario = await Usuario.findOne({ correo: datos.correo }).select("+password");
    const esNuevo = !usuario;

    if (esNuevo) {
      usuario = new Usuario(datos);
    } else {
      usuario.nombre = datos.nombre;
      usuario.rol = datos.rol;
    }

    // Se asigna en texto plano: el hook pre("save") del modelo la hashea.
    usuario.password = PASSWORD;
    await usuario.save();

    console.log(
      `${esNuevo ? "Usuario creado" : "Usuario actualizado"}: ${usuario.correo} (${usuario.rol})`
    );
  }

  await mongoose.disconnect();
  console.log("\nSeed de usuarios completado.");
}

seed().catch(() => {
  console.error("Error al ejecutar el seed de usuarios. Revisa la base académica y SEED_PASSWORD.");
  process.exit(1);
});
