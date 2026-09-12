import { Router } from "express";
import { actualizarEvaluacion } from "../controllers/evaluacionController.js";
import { verificarToken } from "../middleware/auth.js";

const router = Router();

router.use(verificarToken);

router.put("/:id", actualizarEvaluacion);

export default router;
