import { Router } from "express";
import { listarUsuarios } from "../controllers/usuarioController.js";
import { verificarToken } from "../middleware/auth.js";

const router = Router();

router.get("/", verificarToken, listarUsuarios);

export default router;
