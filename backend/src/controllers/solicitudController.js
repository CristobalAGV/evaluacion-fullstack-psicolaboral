import path from "node:path";
import mongoose from "mongoose";
import Solicitud from "../models/Solicitud.js";
import Candidato from "../models/Candidato.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import Usuario from "../models/Usuario.js";
import Evaluacion from "../models/Evaluacion.js";
import Archivo from "../models/Archivo.js";
import { esEvaluadorResponsable } from "../middleware/auth.js";
import { validarArchivo, guardarArchivo, EXTENSIONES_CV, EXTENSIONES_WORD } from "../utils/validarArchivo.js";
import {
  CANDIDATOS_DIR,
  prepararCarpetaSolicitud,
  guardarCopiaEnCarpeta,
  eliminarCarpetaCandidato,
  listarArchivosCarpeta,
} from "../utils/carpetas.js";

const ESTADOS_VALIDOS = ["Pendiente", "En proceso", "Finalizada"];
// Estados a los que una solicitud solo puede llegar si ya tiene evaluador asignado.
const ESTADOS_CON_EVALUADOR = ["En proceso", "Finalizada"];
const NOMBRE_INFORME_EN_CARPETA = "Informe_entrevista";

// Metadatos de los archivos del candidato (sin el contenido) para mostrarlos en el detalle.
const DATOS_ARCHIVO = "nombreOriginal mimeType tamano tipo fecha";
const POBLAR_CANDIDATO = {
  path: "candidato",
  populate: [
    { path: "cvArchivoId", select: DATOS_ARCHIVO },
    { path: "informeArchivoId", select: DATOS_ARCHIVO },
  ],
};

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

function validarCvOpcional(archivo) {
  return archivo ? validarArchivo(archivo, EXTENSIONES_CV, "PDF, DOC o DOCX") : null;
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
      return res.status(400).json({
        mensaje:
          "candidatoNombre, candidatoCorreo, candidatoTelefono, familiaDeCargo, cargo y profesionalResponsable son obligatorios",
      });
    }

    const errorCv = validarCvOpcional(req.file);
    if (errorCv) {
      return res.status(400).json({ mensaje: errorCv });
    }

    if (!mongoose.isValidObjectId(familiaDeCargo)) {
      return res.status(400).json({ mensaje: "familiaDeCargo inválida" });
    }

    const familia = await FamiliaDeCargo.findById(familiaDeCargo);
    if (!familia) {
      return res.status(404).json({ mensaje: "Familia de cargo no encontrada" });
    }

    const { error: errorProfesional } = await validarProfesionalResponsable(profesionalResponsable);
    if (errorProfesional) {
      return res.status(400).json({ mensaje: errorProfesional });
    }

    const candidatoDoc = new Candidato({
      nombre: candidatoNombre,
      correo: candidatoCorreo,
      telefono: candidatoTelefono,
    });
    try {
      await candidatoDoc.validate();
    } catch (errorValidacion) {
      return res.status(400).json({ mensaje: "Datos del candidato inválidos", error: errorValidacion.message });
    }

    let archivoCv = null;
    let solicitud = null;
    try {
      if (req.file) {
        archivoCv = await guardarArchivo({
          archivo: req.file,
          tipo: "cv",
          candidatoId: candidatoDoc._id,
          subidoPor: req.usuario.id,
        });
        candidatoDoc.cvArchivoId = archivoCv._id;
      }
      await candidatoDoc.save();

      solicitud = await Solicitud.create({
        candidato: candidatoDoc._id,
        familiaDeCargo,
        cargo,
        observaciones: observaciones || "",
        profesionalResponsable,
        analistaId: req.usuario.id,
      });
    } catch (errorGuardar) {
      if (archivoCv) await Archivo.findByIdAndDelete(archivoCv._id);
      await Candidato.findByIdAndDelete(candidatoDoc._id);
      throw errorGuardar;
    }

    // Carpeta local opcional: si el disco falla, la solicitud igual queda creada.
    solicitud.carpetaCandidato = await prepararCarpetaSolicitud({
      nombreCandidato: candidatoDoc.nombre,
      solicitudId: solicitud._id,
      cv: req.file,
      familia,
    });
    await solicitud.save();

    const solicitudPoblada = await solicitud.populate([
      POBLAR_CANDIDATO,
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
      .populate(POBLAR_CANDIDATO)
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
      return res.status(400).json({
        mensaje:
          "candidatoNombre, candidatoCorreo, candidatoTelefono, familiaDeCargo, cargo y profesionalResponsable son obligatorios",
      });
    }

    const errorCv = validarCvOpcional(req.file);
    if (errorCv) {
      return res.status(400).json({ mensaje: errorCv });
    }

    if (!mongoose.isValidObjectId(familiaDeCargo)) {
      return res.status(400).json({ mensaje: "familiaDeCargo inválida" });
    }

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    const familia = await FamiliaDeCargo.findById(familiaDeCargo);
    if (!familia) {
      return res.status(404).json({ mensaje: "Familia de cargo no encontrada" });
    }

    const { error: errorProfesional } = await validarProfesionalResponsable(profesionalResponsable);
    if (errorProfesional) {
      return res.status(400).json({ mensaje: errorProfesional });
    }

    const candidato = await Candidato.findById(solicitud.candidato);
    if (!candidato) {
      return res.status(404).json({ mensaje: "Candidato no encontrado" });
    }

    candidato.nombre = candidatoNombre;
    candidato.correo = candidatoCorreo;
    candidato.telefono = candidatoTelefono;
    try {
      await candidato.validate();
    } catch (errorValidacion) {
      return res.status(400).json({ mensaje: "Datos del candidato inválidos", error: errorValidacion.message });
    }

    // CV nuevo: se guarda en MongoDB y reemplaza al anterior (y a la ruta antigua en disco, si había).
    let cvAnteriorId = null;
    let archivoCv = null;
    if (req.file) {
      archivoCv = await guardarArchivo({
        archivo: req.file,
        tipo: "cv",
        candidatoId: candidato._id,
        subidoPor: req.usuario.id,
      });
      cvAnteriorId = candidato.cvArchivoId;
      candidato.cvArchivoId = archivoCv._id;
      candidato.cvUrl = "";
      solicitud.cvUrl = "";
    }

    try {
      await candidato.save();
    } catch (errorGuardar) {
      if (archivoCv) await Archivo.findByIdAndDelete(archivoCv._id);
      throw errorGuardar;
    }
    if (cvAnteriorId) await Archivo.findByIdAndDelete(cvAnteriorId);
    if (req.file) await guardarCopiaEnCarpeta(solicitud.carpetaCandidato, "CV", req.file, EXTENSIONES_CV);

    solicitud.familiaDeCargo = familiaDeCargo;
    solicitud.cargo = cargo;
    solicitud.observaciones = observaciones || "";
    solicitud.profesionalResponsable = profesionalResponsable;

    await solicitud.save();
    const solicitudActualizada = await solicitud.populate([
      POBLAR_CANDIDATO,
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

    await eliminarCarpetaCandidato(solicitud.carpetaCandidato);

    await Solicitud.findByIdAndDelete(id);
    await Evaluacion.deleteMany({ solicitud: id });

    // Sin otras solicitudes, el candidato queda huérfano: se borran él y sus archivos (CV e
    // informe), y así puede volver a postular con el mismo correo desde /postular.
    const candidatoId = solicitud.candidato;
    if (candidatoId && !(await Solicitud.exists({ candidato: candidatoId }))) {
      await Archivo.deleteMany({ candidatoId });
      await Candidato.findByIdAndDelete(candidatoId);
    }

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

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    if (ESTADOS_CON_EVALUADOR.includes(estado) && !solicitud.profesionalResponsable) {
      return res.status(400).json({
        mensaje: `Asigna un evaluador a esta solicitud antes de moverla a "${estado}".`,
      });
    }

    solicitud.estado = estado;
    await solicitud.save();
    await solicitud.populate([
      "candidato",
      "familiaDeCargo",
      { path: "profesionalResponsable", select: "nombre correo rol" },
    ]);

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

// Sube o reemplaza el informe de la entrevista (Word) del candidato de esta solicitud.
// Pueden hacerlo el analista, el admin o el evaluador responsable de la solicitud.
export async function subirInformeEntrevista(req, res) {
  try {
    const { id } = req.params;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    const puedeSubir =
      ["analista", "admin"].includes(req.usuario.rol) || esEvaluadorResponsable(req.usuario, solicitud);
    if (!puedeSubir) {
      return res.status(403).json({ mensaje: "Solo el evaluador responsable puede subir el informe de esta solicitud" });
    }

    if (!req.file) {
      return res.status(400).json({ mensaje: "Adjunta el informe en formato DOC o DOCX" });
    }
    const errorArchivo = validarArchivo(req.file, EXTENSIONES_WORD, "Word (DOC o DOCX)");
    if (errorArchivo) {
      return res.status(400).json({ mensaje: errorArchivo });
    }

    const candidato = await Candidato.findById(solicitud.candidato);
    if (!candidato) {
      return res.status(404).json({ mensaje: "Candidato no encontrado" });
    }

    const archivo = await guardarArchivo({
      archivo: req.file,
      tipo: "informe",
      candidatoId: candidato._id,
      subidoPor: req.usuario.id,
    });
    const informeAnteriorId = candidato.informeArchivoId;

    candidato.informeArchivoId = archivo._id;
    candidato.informeEntrevistaUrl = "";
    try {
      await candidato.save();
    } catch (errorGuardar) {
      await Archivo.findByIdAndDelete(archivo._id);
      throw errorGuardar;
    }

    if (informeAnteriorId) await Archivo.findByIdAndDelete(informeAnteriorId);

    // Copia opcional en la carpeta local del candidato, junto al CV y las plantillas.
    await guardarCopiaEnCarpeta(solicitud.carpetaCandidato, NOMBRE_INFORME_EN_CARPETA, req.file, EXTENSIONES_WORD);

    const { nombreOriginal, mimeType, tamano, tipo, fecha } = archivo;
    return res.json({ informeArchivo: { _id: archivo._id, nombreOriginal, mimeType, tamano, tipo, fecha } });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al subir el informe de entrevista", error: error.message });
  }
}
