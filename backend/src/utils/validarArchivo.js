import path from "node:path";
import Archivo from "../models/Archivo.js";

// Por extensión: mimetypes aceptados y firma (primeros bytes) del formato. No basta con el
// mimetype ni con la extensión, porque los dos los decide quien envía el archivo.
const FORMATOS = {
  ".pdf": {
    mimetypes: ["application/pdf"],
    firma: Buffer.from("%PDF-"),
  },
  ".doc": {
    mimetypes: ["application/msword"],
    firma: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  },
  ".docx": {
    mimetypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    firma: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  },
};

export const EXTENSIONES_CV = [".pdf", ".doc", ".docx"];
export const EXTENSIONES_WORD = [".doc", ".docx"];
export const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024;

// Valida un archivo recibido con multer.memoryStorage() revisando su contenido real (el
// buffer). Devuelve un mensaje de error o null.
export function validarArchivo(archivo, extensionesPermitidas, descripcionFormatos) {
  const extension = path.extname(archivo.originalname || "").toLowerCase();
  if (!extensionesPermitidas.includes(extension)) {
    return `Formato no permitido. Usa ${descripcionFormatos}.`;
  }

  if (!archivo.buffer || archivo.buffer.length === 0) {
    return "El archivo está vacío.";
  }
  if (archivo.buffer.length > TAMANO_MAXIMO_ARCHIVO) {
    return "El archivo supera el tamaño máximo de 5 MB.";
  }

  const { mimetypes, firma } = FORMATOS[extension];
  if (!mimetypes.includes(archivo.mimetype)) {
    return `El tipo del archivo no coincide con su extensión. Usa un ${descripcionFormatos} válido.`;
  }

  if (!archivo.buffer.subarray(0, firma.length).equals(firma)) {
    return `El contenido del archivo no corresponde a un ${descripcionFormatos} válido.`;
  }

  return null;
}

// Nombre para mostrar y para la descarga: sin rutas, sin caracteres de control y acotado.
function limpiarNombre(nombreOriginal) {
  const nombre = path
    .basename(nombreOriginal || "archivo")
    .replace(/[\u0000-\u001f\u007f"\\/]/g, "_")
    .trim();
  return (nombre || "archivo").slice(-150);
}

// Guarda en MongoDB un archivo ya validado. Se identifica por su _id, así que no necesita un
// nombre aleatorio en disco.
export function guardarArchivo({ archivo, tipo, candidatoId, subidoPor = null }) {
  return Archivo.create({
    nombreOriginal: limpiarNombre(archivo.originalname),
    mimeType: archivo.mimetype,
    tamano: archivo.buffer.length,
    tipo,
    datos: archivo.buffer,
    candidatoId,
    subidoPor,
  });
}
