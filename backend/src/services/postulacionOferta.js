import mongoose from "mongoose";
import Oferta from "../models/Oferta.js";
import Candidato from "../models/Candidato.js";
import Solicitud from "../models/Solicitud.js";
import Archivo from "../models/Archivo.js";
import { crearContenedorCv, guardarArchivo } from "../utils/validarArchivo.js";

export async function registrarPostulacionOferta({ ofertaId, nombre, correo, telefono, mensajeAdicional, archivo }) {
  // Un registro de postulación equivale a una solicitud pendiente sin evaluador.
  // La transacción conserva juntas la solicitud y los bytes del CV.
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      return await mongoose.connection.transaction(async (session) => {
        const oferta = await Oferta.findOne({ _id: ofertaId, estado: "publicada" }).session(session);
        if (!oferta) return 404;
        if (await Solicitud.exists({ oferta: ofertaId, correoPostulacion: correo }).session(session)) return 409;

        let candidato = await Candidato.findOne({ $or: [{ correo }, { identidadPostulacion: correo }] })
          .select("+contenedorCv").sort({ _id: 1 }).session(session);
        if (!candidato) {
          candidato = new Candidato({
            nombre, correo, telefono, identidadPostulacion: correo, origen: "postulacion_publica",
          });
        }
        if (!candidato.contenedorCv) {
          candidato.contenedorCv = crearContenedorCv(candidato.nombre, candidato._id);
          await candidato.save({ session });
        }

        const solicitud = new Solicitud({
          oferta: oferta._id,
          correoPostulacion: correo,
          candidato: candidato._id,
          familiaDeCargo: oferta.familiaDeCargo,
          cargo: oferta.cargo,
          mensajeAdicional,
        });
        const cv = await guardarArchivo({
          archivo, tipo: "cv", candidatoId: candidato._id, session,
          postulacion: { contenedor: candidato.contenedorCv, solicitudId: solicitud._id },
        });
        solicitud.cvPostulacion = cv._id;
        await solicitud.save({ session });
        return 201;
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.oferta) return 409;
      if (error.code !== 11000 || !error.keyPattern?.identidadPostulacion || intento === 1) throw error;
      // Otra postulación creó el candidato a la vez. Releerlo en una transacción nueva.
    }
  }
}

export function reemplazarAdjuntoSolicitud({ solicitudId, candidato, archivo, tipo, usuarioId, cambios }) {
  const campo = tipo === "cv" ? "cvPostulacion" : "informePostulacion";
  return mongoose.connection.transaction(async (session) => {
    const solicitud = await Solicitud.findById(solicitudId).select(`candidato ${campo}`).session(session);
    if (!solicitud) return null;
    const perfil = await Candidato.findById(solicitud.candidato).select("+contenedorCv").session(session);
    if (!perfil) return null;
    if (tipo === "cv" && candidato) await candidato.save({ session });
    const filtroAnterior = { _id: solicitud[campo], candidatoId: perfil._id, solicitudId, tipo };
    const archivoAnterior = solicitud[campo] && await Archivo.findOne(filtroAnterior).select("clave").session(session);
    const contenedor = archivoAnterior?.clave?.split("/").slice(0, 2).join("/") || perfil.contenedorCv
      || crearContenedorCv(perfil.nombre, perfil._id);
    const nuevo = await guardarArchivo({
      archivo, tipo, candidatoId: perfil._id, subidoPor: usuarioId, session,
      postulacion: { contenedor, solicitudId },
    });
    await Solicitud.updateOne({ _id: solicitudId }, { ...cambios, [campo]: nuevo._id }, {
      runValidators: true, session,
    });
    if (archivoAnterior) await Archivo.deleteOne(filtroAnterior).session(session);
    return nuevo;
  });
}
