import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOADS_DIR } from "../middleware/upload.js";

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

// Valida un archivo recibido con multer.memoryStorage(). Devuelve un mensaje de error o null.
export function validarArchivo(archivo, extensionesPermitidas, descripcionFormatos) {
  const extension = path.extname(archivo.originalname || "").toLowerCase();
  if (!extensionesPermitidas.includes(extension)) {
    return `Formato no permitido. Usa ${descripcionFormatos}.`;
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

// Escribe en uploads/ un archivo ya validado, con nombre aleatorio para que su URL no se
// pueda adivinar. Devuelve la ruta absoluta y la URL pública.
export async function guardarArchivoValidado(archivo) {
  const extension = path.extname(archivo.originalname).toLowerCase();
  const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const rutaAbsoluta = path.join(UPLOADS_DIR, nombreArchivo);
  await fs.promises.writeFile(rutaAbsoluta, archivo.buffer);
  return { rutaAbsoluta, url: `/uploads/${nombreArchivo}` };
}
