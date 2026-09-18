import path from "node:path";
import fs from "node:fs";
import ExcelJS from "exceljs";
import { PLANTILLAS_DIR } from "./carpetas.js";

// Columnas de la plantilla que identifican al candidato, no son secciones
// narrativas del informe.
const COLUMNAS_DE_DATOS = ["nombre", "cargo"];

const SECCIONES_POR_DEFECTO = ["Fortalezas", "Areas de mejora", "Conclusion"];

function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Lee los titulos de seccion desde la plantilla .xlsx de la familia de cargo,
// que es la estructura de informe que ya usa el equipo. Si la plantilla no
// existe o no se puede leer, cae a una estructura por defecto para no dejar
// al evaluador sin poder generar el borrador.
export async function obtenerSeccionesDeFamilia(familia) {
  if (!familia?.plantillaInforme) return SECCIONES_POR_DEFECTO;

  const rutaPlantilla = path.join(PLANTILLAS_DIR, familia.plantillaInforme);
  if (!fs.existsSync(rutaPlantilla)) return SECCIONES_POR_DEFECTO;

  try {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(rutaPlantilla);

    const hoja = libro.worksheets[0];
    if (!hoja) return SECCIONES_POR_DEFECTO;

    const titulos = [];
    hoja.getRow(1).eachCell((celda) => {
      const titulo = String(celda.value ?? "").trim();
      if (titulo && !COLUMNAS_DE_DATOS.includes(normalizar(titulo))) {
        titulos.push(titulo);
      }
    });

    return titulos.length > 0 ? titulos : SECCIONES_POR_DEFECTO;
  } catch {
    return SECCIONES_POR_DEFECTO;
  }
}
