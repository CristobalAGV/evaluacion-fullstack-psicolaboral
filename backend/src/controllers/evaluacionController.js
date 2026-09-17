import Evaluacion from "../models/Evaluacion.js";
import Solicitud from "../models/Solicitud.js";

const ESTADOS_EVALUACION = ["Pendiente", "En proceso", "Finalizada"];

export async function crearEvaluacion(req, res) {
  try {
    const { id } = req.params;
    const { fechaEvaluacion, resultado, estado } = req.body;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    if (estado && !ESTADOS_EVALUACION.includes(estado)) {
      return res.status(400).json({ mensaje: `estado debe ser uno de: ${ESTADOS_EVALUACION.join(", ")}` });
    }

    const evaluacion = await Evaluacion.create({
      solicitud: id,
      fechaEvaluacion: fechaEvaluacion || undefined,
      resultado: resultado || "",
      estado: estado || undefined,
    });

    return res.status(201).json(evaluacion);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al crear la evaluación", error: error.message });
  }
}

export async function listarEvaluacionesPorSolicitud(req, res) {
  try {
    const { id } = req.params;
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

    const cambios = {};
    if (fechaEvaluacion) cambios.fechaEvaluacion = fechaEvaluacion;
    if (resultado !== undefined) cambios.resultado = resultado;
    if (estado) cambios.estado = estado;

    const evaluacion = await Evaluacion.findByIdAndUpdate(id, cambios, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!evaluacion) {
      return res.status(404).json({ mensaje: "Evaluación no encontrada" });
    }

    return res.json(evaluacion);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al actualizar la evaluación", error: error.message });
  }
}
