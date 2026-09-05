import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import mongoose from "mongoose";

const FAMILIAS = [
  {
    nombre: "Atencion al Cliente",
    plantillaInforme: "plantilla_atencion_cliente.docx",
    pautaEntrevista: "pauta_atencion_cliente.pdf",
  },
  {
    nombre: "Ventas",
    plantillaInforme: "plantilla_ventas.docx",
    pautaEntrevista: "pauta_ventas.pdf",
  },
  {
    nombre: "Administracion",
    plantillaInforme: "plantilla_administracion.docx",
    pautaEntrevista: "pauta_administracion.pdf",
  },
  {
    nombre: "Operaciones",
    plantillaInforme: "plantilla_operaciones.docx",
    pautaEntrevista: "pauta_operaciones.pdf",
  },
];

async function seed() {
  await connectDB();

  for (const familia of FAMILIAS) {
    await FamiliaDeCargo.findOneAndUpdate(
      { nombre: familia.nombre },
      familia,
      { upsert: true, returnDocument: "after" }
    );
    console.log(`Familia de cargo lista: ${familia.nombre}`);
  }

  await mongoose.disconnect();
  console.log("Seed de familias de cargo completado.");
}

seed().catch((error) => {
  console.error("Error al ejecutar el seed:", error.message);
  process.exit(1);
});
