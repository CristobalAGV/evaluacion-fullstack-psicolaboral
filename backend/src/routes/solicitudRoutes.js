import { Router } from "express";
import {
  crearSolicitud,
  listarSolicitudes,
  obtenerSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
  actualizarEstadoSolicitud,
  obtenerCarpetaSolicitud,
  subirInformeEntrevista,
} from "../controllers/solicitudController.js";
import { crearEvaluacion, listarEvaluacionesPorSolicitud } from "../controllers/evaluacionController.js";
import {
  obtenerInforme,
  generarInforme,
  guardarInforme,
  obtenerEvaluacionIa,
  generarEvaluacionIa,
  guardarEvaluacionIa,
} from "../controllers/informeController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { recibirArchivo } from "../middleware/upload.js";

const router = Router();

// Ver: los tres roles. Crear, editar, asignar evaluador y mover de estado: analista y admin.
// Borrar: solo admin. Las evaluaciones y el informe de entrevista además revisan, en el
// controlador, que un evaluador sea el responsable de esa solicitud.
const gestionSolicitudes = permitirRoles("analista", "admin");

router.use(verificarToken);

router.get("/", listarSolicitudes);
router.post("/", gestionSolicitudes, recibirArchivo("cv", "El CV"), crearSolicitud);
router.get("/:id", obtenerSolicitud);
router.put("/:id", gestionSolicitudes, recibirArchivo("cv", "El CV"), actualizarSolicitud);
router.delete("/:id", permitirRoles("admin"), eliminarSolicitud);
router.patch("/:id/estado", gestionSolicitudes, actualizarEstadoSolicitud);
router.get("/:id/carpeta", obtenerCarpetaSolicitud);
router.put("/:id/informe-entrevista", recibirArchivo("informe", "El informe"), subirInformeEntrevista);
router.get("/:id/evaluaciones", listarEvaluacionesPorSolicitud);
router.post("/:id/evaluaciones", permitirRoles("evaluador", "admin"), crearEvaluacion);

// El informe lo puede leer cualquier usuario autenticado (por ejemplo el
// analista), pero solo evaluador y admin pueden generarlo o editarlo.
router.get("/:id/informe", obtenerInforme);
router.post("/:id/informe/generar", permitirRoles("evaluador", "admin"), generarInforme);
router.put("/:id/informe", permitirRoles("evaluador", "admin"), guardarInforme);

// Evaluación de apoyo con nota (CV + informe de entrevista): mismas reglas que el informe.
router.get("/:id/informe/evaluacion", obtenerEvaluacionIa);
router.post("/:id/informe/evaluacion/generar", permitirRoles("evaluador", "admin"), generarEvaluacionIa);
router.put("/:id/informe/evaluacion", permitirRoles("evaluador", "admin"), guardarEvaluacionIa);

export default router;
