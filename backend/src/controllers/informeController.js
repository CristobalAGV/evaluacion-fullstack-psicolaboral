import Informe from "../models/Informe.js";
import Solicitud from "../models/Solicitud.js";
import { obtenerSeccionesDeFamilia } from "../utils/estructuraInforme.js";
import { generarBorradorInforme, ErrorIa } from "../services/servicioIa.js";
import { esEvaluadorResponsable } from "../middleware/auth.js";

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
