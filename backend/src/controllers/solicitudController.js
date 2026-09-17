import path from "node:path";
import mongoose from "mongoose";
import Solicitud from "../models/Solicitud.js";
import Candidato from "../models/Candidato.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import Usuario from "../models/Usuario.js";
import { UPLOADS_DIR, eliminarArchivo } from "../middleware/upload.js";
import {
  PLANTILLAS_DIR,
  CANDIDATOS_DIR,
  crearCarpetaCandidato,
  copiarArchivo,
  eliminarCarpetaCandidato,
  listarArchivosCarpeta,
} from "../utils/carpetas.js";

const ESTADOS_VALIDOS = ["Pendiente", "En proceso", "Finalizada"];

async function validarProfesionalResponsable(profesionalResponsable) {
  if (!mongoose.isValidObjectId(profesionalResponsable)) {
    return { error: "profesionalResponsable inválido" };
  }
  const usuario = await Usuario.findById(profesionalResponsable);
  if (!usuario) {
    return { error: "profesionalResponsable no encontrado" };
  }
  if (usuario.rol !== "evaluador") {
    return { error: "profesionalResponsable debe ser un usuario con rol evaluador" };
  }
  return { usuario };
}

export async function crearSolicitud(req, res) {
  try {
    const {
      candidatoNombre,
      candidatoCorreo,
      candidatoTelefono,
      familiaDeCargo,
      cargo,
      observaciones,
      profesionalResponsable,
    } = req.body;

    if (!candidatoNombre || !candidatoCorreo || !candidatoTelefono || !familiaDeCargo || !cargo || !profesionalResponsable) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({
        mensaje:
          "candidatoNombre, candidatoCorreo, candidatoTelefono, familiaDeCargo, cargo y profesionalResponsable son obligatorios",
      });
    }

    if (!mongoose.isValidObjectId(familiaDeCargo)) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: "familiaDeCargo inválida" });
    }

    const familia = await FamiliaDeCargo.findById(familiaDeCargo);
    if (!familia) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(404).json({ mensaje: "Familia de cargo no encontrada" });
    }

    const { error: errorProfesional } = await validarProfesionalResponsable(profesionalResponsable);
    if (errorProfesional) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: errorProfesional });
    }

    let candidatoDoc;
    try {
      candidatoDoc = await Candidato.create({
        nombre: candidatoNombre,
        correo: candidatoCorreo,
        telefono: candidatoTelefono,
      });
    } catch (errorValidacion) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: "Datos del candidato inválidos", error: errorValidacion.message });
    }

    const cvUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const solicitud = await Solicitud.create({
      candidato: candidatoDoc._id,
      familiaDeCargo,
      cargo,
      cvUrl,
      observaciones: observaciones || "",
      profesionalResponsable,
      analistaId: req.usuario.id,
    });

    try {
      const { nombreCarpeta, carpetaAbsoluta } = await crearCarpetaCandidato(
        candidatoDoc.nombre,
        solicitud._id
      );

      if (req.file) {
        const extensionCv = path.extname(req.file.filename);
        await copiarArchivo(req.file.path, carpetaAbsoluta, `CV${extensionCv}`);
      }

      if (familia.plantillaInforme) {
        const origenInforme = path.join(PLANTILLAS_DIR, familia.plantillaInforme);
        await copiarArchivo(origenInforme, carpetaAbsoluta, path.basename(familia.plantillaInforme));
      }

      if (familia.pautaEntrevista) {
        const origenPauta = path.join(PLANTILLAS_DIR, familia.pautaEntrevista);
        await copiarArchivo(origenPauta, carpetaAbsoluta, path.basename(familia.pautaEntrevista));
      }

      solicitud.carpetaCandidato = nombreCarpeta;
      await solicitud.save();
    } catch (errorCarpeta) {
      await Solicitud.findByIdAndDelete(solicitud._id);
      await Candidato.findByIdAndDelete(candidatoDoc._id);
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(500).json({
        mensaje: "Error al preparar la carpeta del candidato",
        error: errorCarpeta.message,
      });
    }

    const solicitudPoblada = await solicitud.populate([
      "candidato",
      "familiaDeCargo",
      { path: "profesionalResponsable", select: "nombre correo rol" },
    ]);

    return res.status(201).json(solicitudPoblada);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al crear la solicitud", error: error.message });
  }
}

export async function listarSolicitudes(req, res) {
  try {
    const solicitudes = await Solicitud.find()
      .populate("candidato")
      .populate("familiaDeCargo")
      .populate("analistaId", "nombre correo rol")
      .populate("profesionalResponsable", "nombre correo rol")
      .sort({ createdAt: -1 });

    return res.json(solicitudes);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al listar solicitudes", error: error.message });
  }
}

export async function obtenerSolicitud(req, res) {
  try {
    const { id } = req.params;

    const solicitud = await Solicitud.findById(id)
      .populate("candidato")
      .populate("familiaDeCargo")
      .populate("analistaId", "nombre correo rol")
      .populate("profesionalResponsable", "nombre correo rol");

    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    return res.json(solicitud);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al obtener la solicitud", error: error.message });
  }
}

export async function actualizarSolicitud(req, res) {
  try {
    const { id } = req.params;
    const {
      candidatoNombre,
      candidatoCorreo,
      candidatoTelefono,
      familiaDeCargo,
      cargo,
      observaciones,
      profesionalResponsable,
    } = req.body;

    if (!candidatoNombre || !candidatoCorreo || !candidatoTelefono || !familiaDeCargo || !cargo || !profesionalResponsable) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({
        mensaje:
          "candidatoNombre, candidatoCorreo, candidatoTelefono, familiaDeCargo, cargo y profesionalResponsable son obligatorios",
      });
    }

    if (!mongoose.isValidObjectId(familiaDeCargo)) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: "familiaDeCargo inválida" });
    }

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    const familia = await FamiliaDeCargo.findById(familiaDeCargo);
    if (!familia) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(404).json({ mensaje: "Familia de cargo no encontrada" });
    }

    const { error: errorProfesional } = await validarProfesionalResponsable(profesionalResponsable);
    if (errorProfesional) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: errorProfesional });
    }

    try {
      await Candidato.findByIdAndUpdate(
        solicitud.candidato,
        { nombre: candidatoNombre, correo: candidatoCorreo, telefono: candidatoTelefono },
        { runValidators: true }
      );
    } catch (errorValidacion) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: "Datos del candidato inválidos", error: errorValidacion.message });
    }

    solicitud.familiaDeCargo = familiaDeCargo;
    solicitud.cargo = cargo;
    solicitud.observaciones = observaciones || "";
    solicitud.profesionalResponsable = profesionalResponsable;

    if (req.file) {
      const cvAnterior = solicitud.cvUrl;
      solicitud.cvUrl = `/uploads/${req.file.filename}`;
      if (cvAnterior) {
        await eliminarArchivo(path.join(UPLOADS_DIR, path.basename(cvAnterior)));
      }
    }

    await solicitud.save();
    const solicitudActualizada = await solicitud.populate([
      "candidato",
      "familiaDeCargo",
      { path: "profesionalResponsable", select: "nombre correo rol" },
    ]);

    return res.json(solicitudActualizada);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al actualizar la solicitud", error: error.message });
  }
}

export async function eliminarSolicitud(req, res) {
  try {
    const { id } = req.params;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    if (solicitud.cvUrl) {
      await eliminarArchivo(path.join(UPLOADS_DIR, path.basename(solicitud.cvUrl)));
    }

    if (solicitud.carpetaCandidato) {
      await eliminarCarpetaCandidato(solicitud.carpetaCandidato);
    }

    await Solicitud.findByIdAndDelete(id);

    return res.json({ mensaje: "Solicitud eliminada" });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al eliminar la solicitud", error: error.message });
  }
}

export async function actualizarEstadoSolicitud(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ mensaje: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` });
    }

    const solicitud = await Solicitud.findByIdAndUpdate(id, { estado }, { returnDocument: "after" })
      .populate("candidato")
      .populate("familiaDeCargo")
      .populate("profesionalResponsable", "nombre correo rol");

    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    return res.json(solicitud);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al actualizar la solicitud", error: error.message });
  }
}

export async function obtenerCarpetaSolicitud(req, res) {
  try {
    const { id } = req.params;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    if (!solicitud.carpetaCandidato) {
      return res.status(404).json({ mensaje: "La solicitud no tiene una carpeta asociada" });
    }

    const carpetaAbsoluta = path.join(CANDIDATOS_DIR, solicitud.carpetaCandidato);
    const archivos = await listarArchivosCarpeta(carpetaAbsoluta);

    return res.json({ carpeta: solicitud.carpetaCandidato, archivos });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al listar la carpeta de la solicitud", error: error.message });
  }
}
