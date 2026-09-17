import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";

// Renombra familias ya existentes conservando su _id, para que las solicitudes
// que las referencian sigan apuntando al mismo documento.
const RENOMBRES = [
  { desde: "Administracion", hasta: "Administración" },
  { desde: "Atencion al Cliente", hasta: "Atención al Cliente" },
];

async function migrar() {
  await connectDB();

  for (const { desde, hasta } of RENOMBRES) {
    const familia = await FamiliaDeCargo.findOne({ nombre: desde });

    if (!familia) {
      const yaRenombrada = await FamiliaDeCargo.findOne({ nombre: hasta });
      console.log(
        yaRenombrada
          ? `Sin cambios: "${hasta}" ya estaba migrada (_id ${yaRenombrada._id})`
          : `Sin cambios: no existe ninguna familia llamada "${desde}"`
      );
      continue;
    }

    await FamiliaDeCargo.updateOne({ _id: familia._id }, { $set: { nombre: hasta } });
    console.log(`Renombrada: "${desde}" -> "${hasta}" (_id ${familia._id} conservado)`);
  }

  await mongoose.disconnect();
  console.log("Migracion de nombres de familias completada.");
}

migrar().catch((error) => {
  console.error("Error al migrar los nombres de familias:", error.message);
  process.exit(1);
});
