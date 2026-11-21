import Evaluacion from "../models/Evaluacion.js";
import Solicitud from "../models/Solicitud.js";
import { esEvaluadorResponsable, puedeConsultarSolicitud } from "../middleware/auth.js";
import { conEvaluacionActiva, EVALUACION_CERRADA } from "../services/escrituraEvaluacion.js";

const ESTADOS_EVALUACION = ["Pendiente", "En proceso", "Finalizada"];
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MENSAJE_SIN_PERMISO = "Solo el evaluador responsable de la solicitud puede gestionar sus evaluaciones";

// La fecha de evaluación es un día de calendario, sin hora ni zona: se guarda como medianoche
// UTC de ese día y el frontend la muestra también en UTC. Así no se corre un día en Chile.
function fechaCalendario(valor) {
  if (!FECHA_REGEX.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor ? null : fecha;
}

function hoyEnChile() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

// Admin gestiona cualquier evaluación; un evaluador, solo las de solicitudes donde es responsable.
function puedeGestionarEvaluaciones(usuario, solicitud) {
  return usuario.rol === "admin" || esEvaluadorResponsable(usuario, solicitud);
}

export async function crearEvaluacion(req, res) {
  try {
    const { id } = req.params;
    const { fechaEvaluacion, resultado, estado } = req.body;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    if (!puedeGestionarEvaluaciones(req.usuario, solicitud)) {
      return res.status(403).json({ mensaje: MENSAJE_SIN_PERMISO });
    }
    if (solicitud.estado === "Finalizada") return res.status(409).json({ mensaje: EVALUACION_CERRADA });

    if (estado && !ESTADOS_EVALUACION.includes(estado)) {
      return res.status(400).json({ mensaje: `estado debe ser uno de: ${ESTADOS_EVALUACION.join(", ")}` });
    }

    const fecha = fechaCalendario(fechaEvaluacion || hoyEnChile());
    if (!fecha) {
      return res.status(400).json({ mensaje: "fechaEvaluacion debe tener el formato AAAA-MM-DD" });
    }

    const guardada = await conEvaluacionActiva(id, (session) => new Evaluacion({
      solicitud: id,
      fechaEvaluacion: fecha,
      resultado: resultado || "",
      estado: estado || undefined,
    }).save({ session }));
    if (guardada.cerrada) return res.status(409).json({ mensaje: EVALUACION_CERRADA });
    return res.status(201).json(guardada.documento);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al crear la evaluación", error: error.message });
  }
}

export async function listarEvaluacionesPorSolicitud(req, res) {
  try {
    const { id } = req.params;
    const solicitud = await Solicitud.findById(id);
    if (!solicitud) return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    if (!puedeConsultarSolicitud(req.usuario, solicitud)) {
      return res.status(403).json({ mensaje: "Solicitud no asignada" });
    }
    const evaluaciones = await Evaluacion.find({ solicitud: id }).sort({ createdAt: -1 });
    return res.json(evaluaciones);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al listar evaluaciones", error: error.message });
  }
}

export async function actualizarEvaluacion(req, res) {
  try {
    const { id } = req.params;
    const { fechaEvaluacion, resultado, estado } = req.body;

    if (estado && !ESTADOS_EVALUACION.includes(estado)) {
      return res.status(400).json({ mensaje: `estado debe ser uno de: ${ESTADOS_EVALUACION.join(", ")}` });
    }

    const existente = await Evaluacion.findById(id);
    if (!existente) {
      return res.status(404).json({ mensaje: "Evaluación no encontrada" });
    }

    const solicitud = await Solicitud.findById(existente.solicitud);
    if (!solicitud || !puedeGestionarEvaluaciones(req.usuario, solicitud)) {
      return res.status(403).json({ mensaje: MENSAJE_SIN_PERMISO });
    }
    if (solicitud.estado === "Finalizada") return res.status(409).json({ mensaje: EVALUACION_CERRADA });

    const cambios = {};
    if (fechaEvaluacion) {
      const fecha = fechaCalendario(fechaEvaluacion);
      if (!fecha) {
        return res.status(400).json({ mensaje: "fechaEvaluacion debe tener el formato AAAA-MM-DD" });
      }
      cambios.fechaEvaluacion = fecha;
    }
    if (resultado !== undefined) cambios.resultado = resultado;
    if (estado) cambios.estado = estado;

    const guardada = await conEvaluacionActiva(solicitud._id, (session) => Evaluacion.findByIdAndUpdate(id, cambios, {
      returnDocument: "after",
      runValidators: true,
      session,
    }));

    if (guardada.cerrada) return res.status(409).json({ mensaje: EVALUACION_CERRADA });
    if (!guardada.documento) {
      return res.status(404).json({ mensaje: "Evaluación no encontrada" });
    }

    return res.json(guardada.documento);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al actualizar la evaluación", error: error.message });
  }
}
