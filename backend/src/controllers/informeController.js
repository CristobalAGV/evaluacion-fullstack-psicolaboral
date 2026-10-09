import Informe from "../models/Informe.js";
import Solicitud from "../models/Solicitud.js";
import { obtenerSeccionesDeFamilia } from "../utils/estructuraInforme.js";
import {
  generarBorradorInforme,
  generarEvaluacionCandidato,
  normalizarEvaluacion,
  ErrorIa,
} from "../services/servicioIa.js";
import { esEvaluadorResponsable } from "../middleware/auth.js";
import { extraerTextoDeArchivo, ErrorLectura, LARGO_MAXIMO_DOCUMENTO } from "../utils/extraerTextoArchivo.js";
import { obtenerCompetenciasDeFamilia } from "../utils/competenciasFamilia.js";

// Topes para no mandar textos desmedidos al modelo (y no gastar cuota de más).
const LARGO_MAXIMO_APUNTES = 20000;
const LARGO_MAXIMO_INSTRUCCIONES = 2000;
const MENSAJE_SIN_PERMISO = "Solo el evaluador responsable de la solicitud (o un admin) puede generar o editar su informe.";

// Igual que las evaluaciones: admin edita cualquiera; un evaluador, solo las suyas.
function puedeEditarInforme(usuario, solicitud) {
  return usuario.rol === "admin" || esEvaluadorResponsable(usuario, solicitud);
}

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
    const { apuntes, instrucciones } = req.body;

    if (typeof apuntes !== "string" || !apuntes.trim()) {
      return res.status(400).json({
        mensaje: "Escribe los apuntes de la entrevista antes de generar el borrador.",
      });
    }
    if (instrucciones !== undefined && typeof instrucciones !== "string") {
      return res.status(400).json({ mensaje: "Las indicaciones de estilo deben ser texto." });
    }
    if (apuntes.length > LARGO_MAXIMO_APUNTES || (instrucciones || "").length > LARGO_MAXIMO_INSTRUCCIONES) {
      return res.status(400).json({
        mensaje: `Los apuntes admiten hasta ${LARGO_MAXIMO_APUNTES} caracteres y las indicaciones hasta ${LARGO_MAXIMO_INSTRUCCIONES}.`,
      });
    }

    const solicitud = await buscarSolicitudConFamilia(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    // Antes de llamar a la IA: un evaluador ajeno no puede gastar cuota en esta solicitud.
    if (!puedeEditarInforme(req.usuario, solicitud)) {
      return res.status(403).json({ mensaje: MENSAJE_SIN_PERMISO });
    }

    const secciones = await obtenerSeccionesDeFamilia(solicitud.familiaDeCargo);

    const borrador = await generarBorradorInforme({
      cargo: solicitud.cargo,
      familia: solicitud.familiaDeCargo?.nombre || "Sin familia",
      secciones,
      apuntes: apuntes.trim(),
      instrucciones: (instrucciones || "").trim(),
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
    const { secciones, apuntes, instrucciones, modeloIa, estado } = req.body;

    if (!Array.isArray(secciones) || secciones.length === 0) {
      return res.status(400).json({ mensaje: "El informe debe tener al menos una seccion." });
    }

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    if (!puedeEditarInforme(req.usuario, solicitud)) {
      return res.status(403).json({ mensaje: MENSAJE_SIN_PERMISO });
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
        instrucciones: instrucciones ?? "",
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

// ---------------------------------------------------------------------------
// Evaluación de apoyo con nota, a partir del CV y del informe de entrevista guardados.
// ---------------------------------------------------------------------------

export async function obtenerEvaluacionIa(req, res) {
  try {
    const solicitud = await Solicitud.findById(req.params.id)
      .select("evaluacionIa")
      .populate("evaluacionIa.generadoPor", "nombre correo rol");
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }
    return res.json(solicitud.evaluacionIa ?? null);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al obtener la evaluación", error: error.message });
  }
}

export async function generarEvaluacionIa(req, res) {
  try {
    const { id } = req.params;
    const { apuntes } = req.body ?? {};

    // Los apuntes son opcionales aquí: la evaluación se basa en el CV y el informe de entrevista.
    if (apuntes !== undefined && typeof apuntes !== "string") {
      return res.status(400).json({ mensaje: "Los apuntes deben ser texto." });
    }
    if ((apuntes || "").length > LARGO_MAXIMO_APUNTES) {
      return res.status(400).json({ mensaje: `Los apuntes admiten hasta ${LARGO_MAXIMO_APUNTES} caracteres.` });
    }

    const solicitud = await buscarSolicitudConFamilia(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    // Antes de leer archivos o llamar a la IA: un evaluador ajeno no puede gastar cuota.
    if (!puedeEditarInforme(req.usuario, solicitud)) {
      return res.status(403).json({ mensaje: MENSAJE_SIN_PERMISO });
    }

    const { cvArchivoId, informeArchivoId } = solicitud.candidato ?? {};
    const faltantes = [!cvArchivoId && "el CV", !informeArchivoId && "el informe de entrevista (Word)"].filter(Boolean);
    if (faltantes.length) {
      return res.status(400).json({
        mensaje: `Para generar la evaluación falta ${faltantes.join(" y ")} del candidato. Súbelo y vuelve a intentarlo.`,
      });
    }

    const cv = await extraerTextoDeArchivo(cvArchivoId, "el CV");
    const informe = await extraerTextoDeArchivo(informeArchivoId, "el informe de entrevista");
    const competencias = obtenerCompetenciasDeFamilia(solicitud.familiaDeCargo);

    const { evaluacion, modelo } = await generarEvaluacionCandidato({
      cargo: solicitud.cargo,
      familia: solicitud.familiaDeCargo?.nombre || "Sin familia",
      competencias,
      textoCv: cv.texto,
      textoInforme: informe.texto,
      apuntes: (apuntes || "").trim(),
    });

    const avisos = [
      [cv, "El CV"],
      [informe, "El informe de entrevista"],
    ]
      .filter(([documento]) => documento.recortado)
      .map(
        ([documento, nombre]) =>
          `${nombre} es largo (${documento.largoOriginal.toLocaleString("es-CL")} caracteres): la IA solo analizó los primeros ${LARGO_MAXIMO_DOCUMENTO.toLocaleString("es-CL")}.`
      );

    // Igual que el informe: es un borrador y no se guarda hasta que el evaluador lo confirme.
    return res.json({ ...evaluacion, modeloIa: modelo, generadoEn: new Date().toISOString(), avisos });
  } catch (error) {
    if (error instanceof ErrorIa || error instanceof ErrorLectura) {
      return res.status(error.estado).json({ mensaje: error.message });
    }
    return res.status(500).json({ mensaje: "Error al generar la evaluación", error: error.message });
  }
}

export async function guardarEvaluacionIa(req, res) {
  try {
    const { id } = req.params;

    const solicitud = await Solicitud.findById(id).populate("familiaDeCargo");
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }
    if (!puedeEditarInforme(req.usuario, solicitud)) {
      return res.status(403).json({ mensaje: MENSAJE_SIN_PERMISO });
    }

    // Se vuelve a validar: lo que llega del navegador no es confiable aunque venga de la IA.
    let evaluacion;
    try {
      evaluacion = normalizarEvaluacion(req.body, obtenerCompetenciasDeFamilia(solicitud.familiaDeCargo));
    } catch (error) {
      return res.status(400).json({ mensaje: `La evaluación no es válida: ${error.message}` });
    }

    const actualizada = await Solicitud.findByIdAndUpdate(
      id,
      {
        $set: {
          evaluacionIa: {
            ...evaluacion,
            modeloIa: typeof req.body.modeloIa === "string" ? req.body.modeloIa.slice(0, 100) : "",
            generadoPor: req.usuario.id,
            generadoEn: new Date(),
          },
        },
      },
      { returnDocument: "after", runValidators: true }
    )
      .select("evaluacionIa")
      .populate("evaluacionIa.generadoPor", "nombre correo rol");

    return res.json(actualizada.evaluacionIa);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al guardar la evaluación", error: error.message });
  }
}
