import "dotenv/config";

import { connectDB } from "../config/db.js";
import Usuario from "../models/Usuario.js";
import mongoose from "mongoose";

// Contraseña común para todas las cuentas de demostración.
// Se puede cambiar sin tocar el código: SEED_PASSWORD=otraclave npm run seed-usuarios
const PASSWORD = process.env.SEED_PASSWORD || "Demo1234";

const USUARIOS = [
  { nombre: "Daniela Soto", correo: "daniela.soto@ejemplo.cl", rol: "analista" },
  { nombre: "Matías Rojas", correo: "matias.rojas@ejemplo.cl", rol: "evaluador" },
  { nombre: "Carolina Díaz", correo: "carolina.diaz@ejemplo.cl", rol: "evaluador" },
  { nombre: "Paula Vera", correo: "paula.vera@ejemplo.cl", rol: "admin" },
];

async function seed() {
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
  console.log(`\nSeed de usuarios completado. Contraseña para todas las cuentas: ${PASSWORD}`);
}

seed().catch((error) => {
  console.error("Error al ejecutar el seed de usuarios:", error.message);
  process.exit(1);
});
