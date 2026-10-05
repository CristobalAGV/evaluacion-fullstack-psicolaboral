import { Router } from "express";
import { actualizarEvaluacion } from "../controllers/evaluacionController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";

const router = Router();

router.use(verificarToken);

router.put("/:id", permitirRoles("evaluador", "admin"), actualizarEvaluacion);

export default router;
