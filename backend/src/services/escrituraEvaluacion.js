import mongoose from "mongoose";
import Solicitud from "../models/Solicitud.js";

export const EVALUACION_CERRADA = "La solicitud está finalizada. La evaluación es de solo lectura.";

// Escritos en otras colecciones deben competir por la misma solicitud que el cierre.
export function conEvaluacionActiva(solicitudId, escribir) {
  return mongoose.connection.transaction(async (session) => {
    const activa = await Solicitud.updateOne(
      { _id: solicitudId, estado: { $ne: "Finalizada" } },
      { $inc: { __v: 1 } },
      { session }
    );
    if (!activa.matchedCount) return { cerrada: true };
    return { documento: await escribir(session) };
  });
}
