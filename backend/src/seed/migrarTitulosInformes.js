import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Informe from "../models/Informe.js";

// Los titulos de seccion se guardan junto al informe, asi que corregir las
// plantillas no arregla los informes que ya estaban guardados. Este script
// los actualiza en su lugar, conservando el contenido de cada seccion.
const RENOMBRES = {
  "Areas de mejora": "Áreas de mejora",
  Conclusion: "Conclusión",
};

async function migrar() {
  await connectDB();

  const informes = await Informe.find();
  let actualizados = 0;

  for (const informe of informes) {
    let cambio = false;

    const secciones = informe.secciones.map((seccion) => {
      const nuevoTitulo = RENOMBRES[seccion.titulo];
      if (!nuevoTitulo) return seccion;
      cambio = true;
      return { titulo: nuevoTitulo, contenido: seccion.contenido };
    });

    if (!cambio) continue;

    await Informe.updateOne({ _id: informe._id }, { $set: { secciones } });
    actualizados += 1;
    console.log(`Informe ${informe._id}: ${secciones.map((s) => s.titulo).join(", ")}`);
  }

  console.log(
    actualizados === 0
      ? `Sin cambios: ${informes.length} informe(s) revisado(s), ninguno tenia titulos sin tilde.`
      : `Listo: ${actualizados} de ${informes.length} informe(s) actualizado(s).`
  );

  await mongoose.disconnect();
}

migrar().catch((error) => {
  console.error("Error al migrar los titulos de los informes:", error.message);
  process.exit(1);
});
