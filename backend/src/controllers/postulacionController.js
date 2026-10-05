import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mongoose from "mongoose";
import Candidato from "../models/Candidato.js";
import Solicitud from "../models/Solicitud.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import { UPLOADS_DIR, eliminarArchivo } from "../middleware/upload.js";
import { prepararCarpetaSolicitud } from "../utils/carpetas.js";

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^\+?56\s?9\s?\d{4}\s?\d{4}$/;

// Firma (primeros bytes) de cada formato aceptado. No basta con el mimetype ni con la
// extensión, porque los dos los decide quien envía el archivo.
const FIRMAS_POR_EXTENSION = {
  ".pdf": [Buffer.from("%PDF-")],
  ".doc": [Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
  ".docx": [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
};

const MIMETYPES_POR_EXTENSION = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

// Quita etiquetas, caracteres de control y espacios repetidos, y corta al largo máximo.
function limpiarTexto(valor, largoMaximo) {
  if (typeof valor !== "string") return "";
  return valor
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, largoMaximo);
}

function validarCv(archivo) {
  if (!archivo) return "Adjunta tu CV en formato PDF, DOC o DOCX";

  const extension = path.extname(archivo.originalname || "").toLowerCase();
  const firmas = FIRMAS_POR_EXTENSION[extension];
  if (!firmas) return "Formato de CV no permitido. Usa PDF, DOC o DOCX.";

  if (!MIMETYPES_POR_EXTENSION[extension].includes(archivo.mimetype)) {
    return "El tipo del archivo no coincide con su extensión. Usa un PDF, DOC o DOCX válido.";
  }

  const firmaValida = firmas.some((firma) => archivo.buffer.subarray(0, firma.length).equals(firma));
  if (!firmaValida) {
    return "El contenido del archivo no corresponde a un PDF, DOC o DOCX válido.";
  }

  return null;
}

export async function listarFamiliasPublicas(req, res) {
  try {
    const familias = await FamiliaDeCargo.find().select("nombre").sort({ nombre: 1 }).lean();
    return res.json(familias.map(({ _id, nombre }) => ({ _id, nombre })));
  } catch (error) {
    return res.status(500).json({ mensaje: "No se pudieron cargar las familias de cargo" });
  }
}

export async function crearPostulacion(req, res) {
  // Honeypot: el campo "sitioWeb" está oculto en el formulario, así que solo lo llenan los bots.
  // Se responde como si todo hubiera salido bien para no darle pistas al bot.
  if (req.body?.sitioWeb) {
    return res.status(201).json({ mensaje: "Postulación recibida" });
  }

  const nombre = limpiarTexto(req.body?.nombre, 100);
  const correo = limpiarTexto(req.body?.correo, 254).toLowerCase();
  const telefono = limpiarTexto(req.body?.telefono, 20);
  const cargo = limpiarTexto(req.body?.cargo, 100);
  const familiaDeCargo = limpiarTexto(req.body?.familiaDeCargo, 24);

  if (nombre.length < 3) {
    return res.status(400).json({ mensaje: "Ingresa tu nombre completo" });
  }
  if (!CORREO_REGEX.test(correo)) {
    return res.status(400).json({ mensaje: "Ingresa un correo válido" });
  }
  if (!TELEFONO_REGEX.test(telefono)) {
    return res.status(400).json({ mensaje: "Ingresa un celular chileno válido: +56 9 1234 5678" });
  }
  if (cargo.length < 2) {
    return res.status(400).json({ mensaje: "Indica el cargo al que postulas" });
  }
  if (!mongoose.isValidObjectId(familiaDeCargo)) {
    return res.status(400).json({ mensaje: "Selecciona una familia de cargo" });
  }

  const errorCv = validarCv(req.file);
  if (errorCv) {
    return res.status(400).json({ mensaje: errorCv });
  }

  let rutaCv = null;
  let candidato = null;
  let solicitud = null;

  try {
    const familia = await FamiliaDeCargo.findById(familiaDeCargo);
    if (!familia) {
      return res.status(400).json({ mensaje: "Selecciona una familia de cargo" });
    }

    const existente = await Candidato.exists({ correo });
    if (existente) {
      return res.status(409).json({
        mensaje:
          "Ya recibimos una postulación con este correo. Si necesitas actualizar tus datos, comunícate con el equipo de selección.",
      });
    }

    // Nombre aleatorio: el CV no queda en una URL que se pueda adivinar a partir del nombre del candidato.
    const extension = path.extname(req.file.originalname).toLowerCase();
    const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    rutaCv = path.join(UPLOADS_DIR, nombreArchivo);
    await fs.promises.writeFile(rutaCv, req.file.buffer);

    candidato = await Candidato.create({
      nombre,
      correo,
      telefono,
      cvUrl: `/uploads/${nombreArchivo}`,
      origen: "postulacion_publica",
    });

    solicitud = await Solicitud.create({
      candidato: candidato._id,
      familiaDeCargo: familia._id,
      cargo,
      cvUrl: `/uploads/${nombreArchivo}`,
      estado: "Pendiente",
    });

    solicitud.carpetaCandidato = await prepararCarpetaSolicitud({
      nombreCandidato: nombre,
      solicitudId: solicitud._id,
      rutaCv,
      familia,
    });
    await solicitud.save();

    return res.status(201).json({ mensaje: "Postulación recibida" });
  } catch (error) {
    if (solicitud) await Solicitud.findByIdAndDelete(solicitud._id);
    if (candidato) await Candidato.findByIdAndDelete(candidato._id);
    if (rutaCv) await eliminarArchivo(rutaCv);
    console.error("Error al registrar postulación pública:", error.message);
    return res.status(500).json({ mensaje: "No pudimos registrar tu postulación. Inténtalo más tarde." });
  }
}
