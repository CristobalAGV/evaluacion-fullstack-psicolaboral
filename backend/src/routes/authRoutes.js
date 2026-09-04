import { Router } from "express";
import { registrar, login, perfil } from "../controllers/authController.js";
import { verificarToken } from "../middleware/auth.js";

const router = Router();

router.post("/registro", registrar);
router.post("/login", login);
router.get("/perfil", verificarToken, perfil);

export default router;
