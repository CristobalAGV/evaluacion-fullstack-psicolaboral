import Candidato from "../models/Candidato.js";
import Solicitud from "../models/Solicitud.js";

export async function obtenerDashboard(req, res) {
  try {
    const [totalCandidatos, solicitudesPendientes, solicitudesEnProceso, solicitudesFinalizadas] =
      await Promise.all([
        Candidato.countDocuments(),
        Solicitud.countDocuments({ estado: "Pendiente" }),
        Solicitud.countDocuments({ estado: "En proceso" }),
        Solicitud.countDocuments({ estado: "Finalizada" }),
      ]);

    return res.json({
      totalCandidatos,
      solicitudesPendientes,
      solicitudesEnProceso,
      solicitudesFinalizadas,
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al calcular el dashboard", error: error.message });
  }
}
