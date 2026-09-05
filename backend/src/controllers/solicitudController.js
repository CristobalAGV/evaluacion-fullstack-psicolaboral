import path from "node:path";
import mongoose from "mongoose";
import Solicitud from "../models/Solicitud.js";
import Candidato from "../models/Candidato.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import { UPLOADS_DIR, eliminarArchivo } from "../middleware/upload.js";

const ESTADOS_VALIDOS = ["pendiente", "en_proceso", "completada"];

export async function crearSolicitud(req, res) {
  try {
    const { candidato, familiaDeCargo, cargo } = req.body;

    if (!candidato || !familiaDeCargo || !cargo) {
      return res.status(400).json({ mensaje: "candidato, familiaDeCargo y cargo son obligatorios" });
    }

    if (!mongoose.isValidObjectId(familiaDeCargo)) {
      return res.status(400).json({ mensaje: "familiaDeCargo invalida" });
    }

    const familia = await FamiliaDeCargo.findById(familiaDeCargo);
    if (!familia) {
      return res.status(404).json({ mensaje: "Familia de cargo no encontrada" });
    }

    if (!req.file) {
      return res.status(400).json({ mensaje: "El CV es obligatorio" });
    }

    const candidatoDoc = await Candidato.create({ nombre: candidato });
    const cvUrl = `/uploads/${req.file.filename}`;

    const solicitud = await Solicitud.create({
      candidato: candidatoDoc._id,
      familiaDeCargo,
      cargo,
      cvUrl,
      analistaId: req.usuario.id,
    });

    const solicitudPoblada = await solicitud.populate(["candidato", "familiaDeCargo"]);

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
      .sort({ createdAt: -1 });

    return res.json(solicitudes);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al listar solicitudes", error: error.message });
  }
}

export async function actualizarSolicitud(req, res) {
  try {
    const { id } = req.params;
    const { candidato, familiaDeCargo, cargo } = req.body;

    if (!candidato || !familiaDeCargo || !cargo) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: "candidato, familiaDeCargo y cargo son obligatorios" });
    }

    if (!mongoose.isValidObjectId(familiaDeCargo)) {
      if (req.file) await eliminarArchivo(req.file.path);
      return res.status(400).json({ mensaje: "familiaDeCargo invalida" });
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

    await Candidato.findByIdAndUpdate(solicitud.candidato, { nombre: candidato });

    solicitud.familiaDeCargo = familiaDeCargo;
    solicitud.cargo = cargo;

    if (req.file) {
      const cvAnterior = solicitud.cvUrl;
      solicitud.cvUrl = `/uploads/${req.file.filename}`;
      if (cvAnterior) {
        await eliminarArchivo(path.join(UPLOADS_DIR, path.basename(cvAnterior)));
      }
    }

    await solicitud.save();
    const solicitudActualizada = await solicitud.populate(["candidato", "familiaDeCargo"]);

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
      .populate("familiaDeCargo");

    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    return res.json(solicitud);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al actualizar la solicitud", error: error.message });
  }
}
