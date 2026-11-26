import Candidato from "../models/Candidato.js";
import Solicitud from "../models/Solicitud.js";

export async function obtenerDashboard(req, res) {
  try {
    const filtro = req.usuario.rol === "evaluador" ? { profesionalResponsable: req.usuario.id } : {};
    const [totalCandidatos, solicitudesPendientes, solicitudesEnProceso, solicitudesFinalizadas] =
      await Promise.all([
        req.usuario.rol === "evaluador"
          ? Solicitud.distinct("candidato", filtro).then((ids) => ids.length)
          : Candidato.countDocuments(),
        Solicitud.countDocuments({ ...filtro, estado: "Pendiente" }),
        Solicitud.countDocuments({ ...filtro, estado: "En proceso" }),
        Solicitud.countDocuments({ ...filtro, estado: "Finalizada" }),
      ]);

    return res.json({
      totalCandidatos,
      solicitudesPendientes,
      solicitudesEnProceso,
      solicitudesFinalizadas,
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al calcular el dashboard" });
  }
}
