import { Router } from "express";
import mongoose from "mongoose";
import {
  crearSolicitud,
  listarSolicitudes,
  obtenerSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
  actualizarEstadoSolicitud,
  obtenerCarpetaSolicitud,
  descargarPautaEntrevista,
  subirInformeEntrevista,
  reemplazarCv,
} from "../controllers/solicitudController.js";
import { crearEvaluacion, listarEvaluacionesPorSolicitud } from "../controllers/evaluacionController.js";
import {
  obtenerInforme,
  generarInforme,
  guardarInforme,
  obtenerEvaluacionIa,
  generarEvaluacionIa,
  guardarEvaluacionIa,
  generarPreguntas,
} from "../controllers/informeController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { recibirArchivo } from "../middleware/upload.js";
import { consultarPreseleccion, recalcularPreseleccion, autorizarContinuidad } from "../controllers/preseleccionController.js";

const router = Router();

// Ver: los tres roles. Crear, editar, asignar evaluador y mover de estado: analista y admin.
// Borrar: solo admin. Las evaluaciones y el informe de entrevista además revisan, en el
// controlador, que un evaluador sea el responsable de esa solicitud.
const gestionSolicitudes = permitirRoles("analista", "admin");

router.use(verificarToken, permitirRoles("analista", "evaluador", "admin"));
const validarId = (req, res, next) => mongoose.isObjectIdOrHexString(req.params.id)
  ? next() : res.status(404).json({ mensaje: "Solicitud no encontrada" });

router.get("/", listarSolicitudes);
router.post("/", gestionSolicitudes, recibirArchivo("cv", "El CV"), crearSolicitud);
router.get("/:id", validarId, obtenerSolicitud);
router.put("/:id", gestionSolicitudes, validarId, recibirArchivo("cv", "El CV"), actualizarSolicitud);
router.put("/:id/cv", gestionSolicitudes, recibirArchivo("cv", "El CV"), reemplazarCv);
router.delete("/:id", permitirRoles("admin"), validarId, eliminarSolicitud);
router.patch("/:id/estado", gestionSolicitudes, validarId, actualizarEstadoSolicitud);
router.get("/:id/carpeta", obtenerCarpetaSolicitud);
router.get("/:id/preseleccion", consultarPreseleccion);
router.post("/:id/preseleccion/recalcular", gestionSolicitudes, recalcularPreseleccion);
router.post("/:id/preseleccion/continuar", gestionSolicitudes, autorizarContinuidad);
router.get("/:id/pauta-entrevista", descargarPautaEntrevista);
router.put("/:id/informe-entrevista", validarId, recibirArchivo("informe", "El informe"), subirInformeEntrevista);
router.get("/:id/evaluaciones", validarId, listarEvaluacionesPorSolicitud);
router.post("/:id/evaluaciones", permitirRoles("evaluador", "admin"), validarId, crearEvaluacion);

if (process.env.IA_HABILITADA === "true") {
router.post("/:id/preguntas-entrevista/generar", permitirRoles("evaluador", "admin"), validarId, generarPreguntas);
// El informe lo puede leer cualquier usuario autenticado (por ejemplo el
// analista), pero solo evaluador y admin pueden generarlo o editarlo.
router.get("/:id/informe", validarId, obtenerInforme);
router.post("/:id/informe/generar", permitirRoles("evaluador", "admin"), validarId, generarInforme);
router.put("/:id/informe", permitirRoles("evaluador", "admin"), validarId, guardarInforme);

// Evaluación de apoyo con nota (CV + informe de entrevista): mismas reglas que el informe.
router.get("/:id/informe/evaluacion", validarId, obtenerEvaluacionIa);
router.post("/:id/informe/evaluacion/generar", permitirRoles("evaluador", "admin"), validarId, generarEvaluacionIa);
router.put("/:id/informe/evaluacion", permitirRoles("evaluador", "admin"), validarId, guardarEvaluacionIa);

}

export default router;
