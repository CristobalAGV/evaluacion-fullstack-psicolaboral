import { Router } from "express";
import { descargarArchivo } from "../controllers/archivoController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";

const router = Router();

// Los mismos roles que pueden ver el detalle de una solicitud.
router.get("/:id", verificarToken, permitirRoles("analista", "evaluador", "admin"), descargarArchivo);

export default router;
