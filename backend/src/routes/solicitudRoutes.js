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
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { uploadCv, recibirInformeEntrevista } from "../middleware/upload.js";

const router = Router();

// Ver: los tres roles. Crear, editar, asignar evaluador y mover de estado: analista y admin.
// Borrar: solo admin. Las evaluaciones y el informe de entrevista además revisan, en el
// controlador, que un evaluador sea el responsable de esa solicitud.
const gestionSolicitudes = permitirRoles("analista", "admin");

router.use(verificarToken);

router.get("/", listarSolicitudes);
router.post("/", gestionSolicitudes, uploadCv.single("cv"), crearSolicitud);
router.get("/:id", obtenerSolicitud);
router.put("/:id", gestionSolicitudes, uploadCv.single("cv"), actualizarSolicitud);
router.delete("/:id", permitirRoles("admin"), eliminarSolicitud);
router.patch("/:id/estado", gestionSolicitudes, actualizarEstadoSolicitud);
router.get("/:id/carpeta", obtenerCarpetaSolicitud);
router.put("/:id/informe-entrevista", recibirInformeEntrevista, subirInformeEntrevista);
router.get("/:id/evaluaciones", listarEvaluacionesPorSolicitud);
router.post("/:id/evaluaciones", permitirRoles("evaluador", "admin"), crearEvaluacion);

export default router;
