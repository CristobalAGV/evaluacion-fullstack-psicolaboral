import { Router } from "express";
import mongoose from "mongoose";
import { actualizarEvaluacion } from "../controllers/evaluacionController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";

const router = Router();

router.use(verificarToken);
const validarId = (req, res, next) => mongoose.isObjectIdOrHexString(req.params.id)
  ? next() : res.status(404).json({ mensaje: "Evaluación no encontrada" });

router.put("/:id", permitirRoles("evaluador", "admin"), validarId, actualizarEvaluacion);

export default router;
