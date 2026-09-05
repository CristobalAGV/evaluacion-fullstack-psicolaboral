import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PLANTILLAS_DIR = path.join(__dirname, "..", "..", "plantillas");
export const CANDIDATOS_DIR = path.join(__dirname, "..", "..", "candidatos");

if (!fs.existsSync(CANDIDATOS_DIR)) {
  fs.mkdirSync(CANDIDATOS_DIR, { recursive: true });
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

export async function eliminarCarpetaCandidato(nombreCarpeta) {
  if (!nombreCarpeta) return;
  const carpetaAbsoluta = path.join(CANDIDATOS_DIR, nombreCarpeta);
  await fs.promises.rm(carpetaAbsoluta, { recursive: true, force: true });
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
