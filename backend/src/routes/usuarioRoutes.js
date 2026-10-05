import { Router } from "express";
import { listarUsuarios } from "../controllers/usuarioController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";

const router = Router();

// Lo usa el selector de evaluador al crear o editar solicitudes.
router.get("/", verificarToken, permitirRoles("analista", "admin"), listarUsuarios);

export default router;
