import Informe from "../models/Informe.js";
import Solicitud from "../models/Solicitud.js";
import { obtenerSeccionesDeFamilia } from "../utils/estructuraInforme.js";
import { generarBorradorInforme, ErrorIa } from "../services/servicioIa.js";

async function buscarSolicitudConFamilia(id) {
  return Solicitud.findById(id).populate("familiaDeCargo").populate("candidato");
}

export async function obtenerInforme(req, res) {
  try {
    const { id } = req.params;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    const informe = await Informe.findOne({ solicitud: id }).populate(
      "generadoPor",
      "nombre correo rol"
    );

    // Sin informe todavia no es un error: la vista necesita saberlo para
    // ofrecer la generacion del borrador.
    return res.json(informe);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al obtener el informe", error: error.message });
  }
}

export async function generarInforme(req, res) {
  try {
    const { id } = req.params;
    const { apuntes } = req.body;

    if (!apuntes || !apuntes.trim()) {
      return res.status(400).json({
        mensaje: "Escribe los apuntes de la entrevista antes de generar el borrador.",
      });
    }

    const solicitud = await buscarSolicitudConFamilia(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    const secciones = await obtenerSeccionesDeFamilia(solicitud.familiaDeCargo);

    const borrador = await generarBorradorInforme({
      cargo: solicitud.cargo,
      familia: solicitud.familiaDeCargo?.nombre || "Sin familia",
      secciones,
      apuntes: apuntes.trim(),
    });

    // El borrador no se guarda automaticamente: el evaluador lo revisa, lo
    // corrige y decide guardarlo.
    return res.json({
      secciones: borrador.secciones,
      modeloIa: borrador.modelo,
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ErrorIa) {
      return res.status(error.estado).json({ mensaje: error.message });
    }
    return res.status(500).json({ mensaje: "Error al generar el informe", error: error.message });
  }
}

export async function guardarInforme(req, res) {
  try {
    const { id } = req.params;
    const { secciones, apuntes, modeloIa, estado } = req.body;

    if (!Array.isArray(secciones) || secciones.length === 0) {
      return res.status(400).json({ mensaje: "El informe debe tener al menos una seccion." });
    }

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    const seccionesLimpias = secciones
      .filter((s) => s && s.titulo)
      .map((s) => ({ titulo: String(s.titulo), contenido: String(s.contenido ?? "") }));

    const informe = await Informe.findOneAndUpdate(
      { solicitud: id },
      {
        solicitud: id,
        candidato: solicitud.candidato,
        secciones: seccionesLimpias,
        apuntes: apuntes ?? "",
        modeloIa: modeloIa ?? "",
        estado: estado === "finalizado" ? "finalizado" : "borrador",
        generadoPor: req.usuario.id,
        generadoEn: new Date(),
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    ).populate("generadoPor", "nombre correo rol");

    return res.json(informe);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al guardar el informe", error: error.message });
  }
}
