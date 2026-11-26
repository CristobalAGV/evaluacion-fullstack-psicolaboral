import mongoose from "mongoose";
import Solicitud from "../models/Solicitud.js";
import Oferta from "../models/Oferta.js";
import { puedeConsultarSolicitud } from "../middleware/auth.js";
import { antecedentesPermitidos, calcularPreseleccion, validarCamposPreseleccion, requiereContinuidad } from "../utils/preseleccion.js";

const noEncontrada = { mensaje: "Solicitud no encontrada" };

export async function consultarPreseleccion(req, res) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json(noEncontrada);
    const solicitud = await Solicitud.findById(req.params.id)
      .select("preseleccion profesionalResponsable +antecedentesPreseleccion +historialPreseleccion");
    if (!solicitud) return res.status(404).json(noEncontrada);
    if (!puedeConsultarSolicitud(req.usuario, solicitud)) return res.status(403).json({ mensaje: "Solicitud no asignada" });
    return res.json({
      preseleccion: solicitud.preseleccion ?? null,
      antecedentes: solicitud.antecedentesPreseleccion ?? {},
      historial: solicitud.historialPreseleccion ?? [],
    });
  } catch {
    return res.status(500).json({ mensaje: "No se pudo consultar la preselección." });
  }
}

const actualizar = (continuidad) => async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json(noEncontrada);
  const motivo = typeof req.body?.motivo === "string" ? req.body.motivo.trim() : "";
  if (!motivo || motivo.length > 500) return res.status(400).json({ mensaje: "Escribe un motivo de hasta 500 caracteres." });
  let corregidos;
  try {
    if (!continuidad && req.body?.antecedentes !== undefined) {
      corregidos = validarCamposPreseleccion(req.body.antecedentes, antecedentesPermitidos);
    }
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
  try {
    const salida = await mongoose.connection.transaction(async (session) => {
      const solicitud = await Solicitud.findById(req.params.id)
        .select("+antecedentesPreseleccion").session(session);
      if (!solicitud) return [404, noEncontrada];
      if (solicitud.estado === "Finalizada") return [409, { mensaje: "La solicitud está finalizada." }];
      const registro = { motivo, usuario: req.usuario.id, fecha: new Date() };
      let preseleccion;
      const cambios = {};
      if (continuidad) {
        if (!requiereContinuidad(solicitud)) return [409, { mensaje: "La solicitud no requiere autorización de continuidad." }];
        preseleccion = { ...solicitud.preseleccion, continuidad: registro };
      } else {
        const oferta = solicitud.oferta ? await Oferta.findById(solicitud.oferta).session(session) : null;
        if (!oferta) return [409, { mensaje: "La solicitud no tiene una oferta disponible para recalcular." }];
        const antecedentes = corregidos ?? solicitud.antecedentesPreseleccion ?? {};
        const resultado = calcularPreseleccion(oferta, antecedentes);
        if (!resultado) return [409, { mensaje: "La oferta no tiene requisitos estructurados." }];
        preseleccion = { ...resultado, recalculo: registro };
        cambios.antecedentesPreseleccion = antecedentes;
      }
      await Solicitud.updateOne({ _id: solicitud._id }, {
        $set: { ...cambios, preseleccion },
        ...(!continuidad && { $push: { historialPreseleccion: {
          ...registro, resultadoAnterior: solicitud.preseleccion ?? null,
          antecedentesAnteriores: solicitud.antecedentesPreseleccion ?? {},
        } } }),
      }, { session });
      return [200, { preseleccion }];
    });
    return res.status(salida[0]).json(salida[1]);
  } catch {
    return res.status(500).json({ mensaje: "No se pudo actualizar la preselección." });
  }
};

export const recalcularPreseleccion = actualizar(false);
export const autorizarContinuidad = actualizar(true);
