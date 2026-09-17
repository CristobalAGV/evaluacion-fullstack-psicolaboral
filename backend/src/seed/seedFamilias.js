import "dotenv/config";

import { connectDB } from "../config/db.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import mongoose from "mongoose";

const FAMILIAS = [
  {
    nombre: "Atención al Cliente",
    plantillaInforme: "atencion-cliente/plantilla_informe.xlsx",
    pautaEntrevista: "atencion-cliente/pauta_entrevista.docx",
  },
  {
    nombre: "Ventas",
    plantillaInforme: "ventas/plantilla_informe.xlsx",
    pautaEntrevista: "ventas/pauta_entrevista.docx",
  },
  {
    nombre: "Administración",
    plantillaInforme: "administracion/plantilla_informe.xlsx",
    pautaEntrevista: "administracion/pauta_entrevista.docx",
  },
  {
    nombre: "Operaciones",
    plantillaInforme: "operaciones/plantilla_informe.xlsx",
    pautaEntrevista: "operaciones/pauta_entrevista.docx",
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
