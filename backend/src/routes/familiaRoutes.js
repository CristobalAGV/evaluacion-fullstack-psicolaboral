import { Router } from "express";
import { listarFamilias } from "../controllers/familiaController.js";
import { verificarToken } from "../middleware/auth.js";

const router = Router();

router.get("/", verificarToken, listarFamilias);

export default router;
