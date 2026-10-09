import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import Archivo from "../models/Archivo.js";

// Tope de texto que se envía a la IA por documento, para no gastar cuota de más con
// documentos muy largos. Si se recorta, la respuesta lo avisa.
export const LARGO_MAXIMO_DOCUMENTO = 15000;

// Error con mensaje pensado para mostrarse al usuario final.
export class ErrorLectura extends Error {
  constructor(mensaje, estado = 422) {
    super(mensaje);
    this.name = "ErrorLectura";
    this.estado = estado;
  }
}

async function textoDePdf(datos) {
  const pdf = await getDocumentProxy(new Uint8Array(datos));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function textoDeDocx(datos) {
  const { value } = await mammoth.extractRawText({ buffer: datos });
  return value;
}

async function textoDeDoc(datos) {
  const documento = await new WordExtractor().extract(datos);
  return documento.getBody();
}

const LECTORES = { ".pdf": textoDePdf, ".docx": textoDeDocx, ".doc": textoDeDoc };

// Une espacios repetidos y líneas en blanco de más: la extracción de PDF deja mucho relleno.
function limpiar(texto) {
  return String(texto ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Lee el CV o el informe de entrevista guardado en MongoDB y devuelve su texto, recortado al
// tope. `descripcion` se usa en los mensajes de error ("el CV", "el informe de entrevista").
export async function extraerTextoDeArchivo(archivoId, descripcion) {
  const archivo = archivoId ? await Archivo.findById(archivoId).select("+datos") : null;
  if (!archivo) {
    throw new ErrorLectura(`No se encontró ${descripcion} del candidato. Vuelve a subirlo.`, 400);
  }

  const extension = path.extname(archivo.nombreOriginal).toLowerCase();
  const leer = LECTORES[extension];
  if (!leer) {
    throw new ErrorLectura(`El formato de ${descripcion} (${extension || "sin extensión"}) no se puede leer.`);
  }

  let texto;
  try {
    texto = limpiar(await leer(archivo.datos));
  } catch {
    const sugerencia =
      extension === ".doc" ? " Los .doc antiguos a veces no se pueden leer: guárdalo como .docx o PDF y vuelve a subirlo." : "";
    throw new ErrorLectura(`No se pudo leer el contenido del archivo (${descripcion}).${sugerencia}`);
  }

  // Un PDF escaneado (solo imágenes) no trae texto: no tiene sentido mandarlo a la IA.
  if (!texto) {
    throw new ErrorLectura(
      `No se pudo leer el contenido del archivo (${descripcion}): no contiene texto. Si es un PDF escaneado, sube una versión con texto seleccionable.`
    );
  }

  const recortado = texto.length > LARGO_MAXIMO_DOCUMENTO;
  return {
    texto: recortado ? texto.slice(0, LARGO_MAXIMO_DOCUMENTO) : texto,
    recortado,
    largoOriginal: texto.length,
    nombreOriginal: archivo.nombreOriginal,
  };
}
