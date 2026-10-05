import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PLANTILLAS_DIR = path.join(__dirname, "..", "..", "plantillas");
export const CANDIDATOS_DIR = path.join(__dirname, "..", "..", "candidatos");

// Las carpetas de candidato son solo una comodidad local: los archivos reales viven en MongoDB
// (modelo Archivo). Si el disco no está disponible, la aplicación sigue funcionando sin ellas.
try {
  fs.mkdirSync(CANDIDATOS_DIR, { recursive: true });
} catch (error) {
  console.warn("No se pudo crear la carpeta de candidatos:", error.message);
}

export function slugify(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function crearCarpetaCandidato(nombreCandidato, solicitudId) {
  const slugNombre = slugify(nombreCandidato) || "candidato";
  const nombreCarpeta = `${slugNombre}-${solicitudId}`;
  const carpetaAbsoluta = path.join(CANDIDATOS_DIR, nombreCarpeta);

  await fs.promises.mkdir(carpetaAbsoluta, { recursive: true });

  return { nombreCarpeta, carpetaAbsoluta };
}

export async function copiarArchivo(rutaOrigen, carpetaDestino, nombreDestino) {
  const destino = path.join(carpetaDestino, nombreDestino);
  await fs.promises.copyFile(rutaOrigen, destino);
  return destino;
}

// Crea la carpeta de la solicitud con el CV (si hay) y las plantillas de su familia de cargo.
// Nunca lanza: si el disco falla (por ejemplo en Render) devuelve "" y la solicitud sigue.
// cv: archivo de multer en memoria ({ originalname, buffer }) o null.
export async function prepararCarpetaSolicitud({ nombreCandidato, solicitudId, cv, familia }) {
  try {
    const { nombreCarpeta, carpetaAbsoluta } = await crearCarpetaCandidato(nombreCandidato, solicitudId);

    if (cv) {
      const extension = path.extname(cv.originalname).toLowerCase();
      await fs.promises.writeFile(path.join(carpetaAbsoluta, `CV${extension}`), cv.buffer);
    }

    if (familia.plantillaInforme) {
      const origenInforme = path.join(PLANTILLAS_DIR, familia.plantillaInforme);
      await copiarArchivo(origenInforme, carpetaAbsoluta, path.basename(familia.plantillaInforme));
    }

    if (familia.pautaEntrevista) {
      const origenPauta = path.join(PLANTILLAS_DIR, familia.pautaEntrevista);
      await copiarArchivo(origenPauta, carpetaAbsoluta, path.basename(familia.pautaEntrevista));
    }

    return nombreCarpeta;
  } catch (error) {
    console.warn(`No se pudo preparar la carpeta local de la solicitud ${solicitudId}:`, error.message);
    return "";
  }
}

// Copia un archivo en memoria a la carpeta del candidato, reemplazando las versiones con otra
// extensión. Igual que la carpeta, es opcional: si falla, solo se registra.
export async function guardarCopiaEnCarpeta(nombreCarpeta, nombreBase, archivo, extensionesPosibles) {
  if (!nombreCarpeta) return;
  try {
    const carpetaAbsoluta = path.join(CANDIDATOS_DIR, nombreCarpeta);
    if (!fs.existsSync(carpetaAbsoluta)) return;
    for (const extension of extensionesPosibles) {
      await fs.promises.rm(path.join(carpetaAbsoluta, `${nombreBase}${extension}`), { force: true });
    }
    const extension = path.extname(archivo.originalname).toLowerCase();
    await fs.promises.writeFile(path.join(carpetaAbsoluta, `${nombreBase}${extension}`), archivo.buffer);
  } catch (error) {
    console.warn(`No se pudo copiar ${nombreBase} a la carpeta ${nombreCarpeta}:`, error.message);
  }
}

export async function eliminarCarpetaCandidato(nombreCarpeta) {
  if (!nombreCarpeta) return;
  try {
    const carpetaAbsoluta = path.join(CANDIDATOS_DIR, nombreCarpeta);
    await fs.promises.rm(carpetaAbsoluta, { recursive: true, force: true });
  } catch (error) {
    console.warn(`No se pudo borrar la carpeta ${nombreCarpeta}:`, error.message);
  }
}

const EXTENSION_A_TIPO = {
  ".pdf": "pdf",
  ".doc": "word",
  ".docx": "word",
  ".xls": "excel",
  ".xlsx": "excel",
};

export async function listarArchivosCarpeta(carpetaAbsoluta) {
  if (!fs.existsSync(carpetaAbsoluta)) {
    return [];
  }

  const entradas = await fs.promises.readdir(carpetaAbsoluta, { withFileTypes: true });

  return entradas
    .filter((entrada) => entrada.isFile())
    .map((entrada) => {
      const extension = path.extname(entrada.name).toLowerCase();
      return {
        nombre: entrada.name,
        tipo: EXTENSION_A_TIPO[extension] || extension.replace(".", "") || "desconocido",
      };
    });
}
