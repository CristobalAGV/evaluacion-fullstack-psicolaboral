import { Router } from "express";
import {
  crearSolicitud,
  listarSolicitudes,
  obtenerSolicitud,
  actualizarSolicitud,
  eliminarSolicitud,
  actualizarEstadoSolicitud,
  obtenerCarpetaSolicitud,
} from "../controllers/solicitudController.js";
import { crearEvaluacion, listarEvaluacionesPorSolicitud } from "../controllers/evaluacionController.js";
import { obtenerInforme, generarInforme, guardarInforme } from "../controllers/informeController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { uploadCv } from "../middleware/upload.js";

const router = Router();

router.use(verificarToken);

router.get("/", listarSolicitudes);
router.post("/", uploadCv.single("cv"), crearSolicitud);
router.get("/:id", obtenerSolicitud);
router.put("/:id", uploadCv.single("cv"), actualizarSolicitud);
router.delete("/:id", eliminarSolicitud);
router.patch("/:id/estado", actualizarEstadoSolicitud);
router.get("/:id/carpeta", obtenerCarpetaSolicitud);
router.get("/:id/evaluaciones", listarEvaluacionesPorSolicitud);
router.post("/:id/evaluaciones", crearEvaluacion);

// El informe lo puede leer cualquier usuario autenticado (por ejemplo el
// analista), pero solo evaluador y admin pueden generarlo o editarlo.
router.get("/:id/informe", obtenerInforme);
router.post("/:id/informe/generar", permitirRoles("evaluador", "admin"), generarInforme);
router.put("/:id/informe", permitirRoles("evaluador", "admin"), guardarInforme);

export default router;
