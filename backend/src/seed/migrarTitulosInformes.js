import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Informe from "../models/Informe.js";
import Solicitud from "../models/Solicitud.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import { obtenerSeccionesDeFamilia } from "../utils/estructuraInforme.js";

// Los titulos de seccion se guardan junto al informe, asi que corregir las
// plantillas no arregla los informes ya guardados. Este script los repara
// tomando como fuente de verdad la plantilla de la familia de cargo.
//
// Corrige dos defectos:
//  - Titulos sin tilde ("Areas de mejora").
//  - Titulos con el caracter de reemplazo U+FFFD en lugar de la vocal
//    acentuada ("�reas de mejora"), que aparece cuando el texto viajo
//    por un canal que no respeto UTF-8.
const REEMPLAZO = "�";

function sinTilde(caracter) {
  return caracter.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Un titulo guardado corresponde a uno canonico si coinciden caracter a
// caracter, tolerando que le falte la tilde o que la vocal se haya perdido.
function corresponde(guardado, canonico) {
  if (guardado === canonico) return true;
  if (guardado.length !== canonico.length) return false;

  for (let i = 0; i < canonico.length; i++) {
    const a = guardado[i];
    const b = canonico[i];
    if (a === b) continue;
    if (a === REEMPLAZO) continue;
    if (sinTilde(a) === sinTilde(b)) continue;
    return false;
  }
  return true;
}

async function migrar() {
  await connectDB();

  const informes = await Informe.find();
  let actualizados = 0;
  let sinCorreccion = 0;

  for (const informe of informes) {
    const solicitud = await Solicitud.findById(informe.solicitud).populate("familiaDeCargo");
    const canonicos = await obtenerSeccionesDeFamilia(solicitud?.familiaDeCargo);

    let cambio = false;
    const secciones = informe.secciones.map((seccion) => {
      if (canonicos.includes(seccion.titulo)) return seccion;

      const canonico = canonicos.find((c) => corresponde(seccion.titulo, c));
      if (!canonico) {
        console.log(`  Sin equivalente en la plantilla: ${JSON.stringify(seccion.titulo)}`);
        sinCorreccion += 1;
        return seccion;
      }

      cambio = true;
      console.log(`  ${JSON.stringify(seccion.titulo)} -> ${JSON.stringify(canonico)}`);
      return { titulo: canonico, contenido: seccion.contenido };
    });

    if (!cambio) continue;

    await Informe.updateOne({ _id: informe._id }, { $set: { secciones } });
    actualizados += 1;
    console.log(`Informe ${informe._id} actualizado.`);
  }

  console.log(
    actualizados === 0
      ? `Sin cambios: ${informes.length} informe(s) revisado(s), todos con los titulos correctos.`
      : `Listo: ${actualizados} de ${informes.length} informe(s) actualizado(s).`
  );
  if (sinCorreccion > 0) {
    console.log(`Atencion: ${sinCorreccion} titulo(s) no se pudieron asociar a la plantilla.`);
  }

  await mongoose.disconnect();
}

migrar().catch((error) => {
  console.error("Error al migrar los titulos de los informes:", error.message);
  process.exit(1);
});
