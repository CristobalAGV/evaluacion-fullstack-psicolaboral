import { Router } from "express";
import {
  crearSolicitud,
  listarSolicitudes,
  actualizarSolicitud,
  eliminarSolicitud,
  actualizarEstadoSolicitud,
} from "../controllers/solicitudController.js";
import { verificarToken } from "../middleware/auth.js";
import { uploadCv } from "../middleware/upload.js";

const router = Router();

router.use(verificarToken);

router.get("/", listarSolicitudes);
router.post("/", uploadCv.single("cv"), crearSolicitud);
router.put("/:id", uploadCv.single("cv"), actualizarSolicitud);
router.delete("/:id", eliminarSolicitud);
router.patch("/:id/estado", actualizarEstadoSolicitud);

export default router;
