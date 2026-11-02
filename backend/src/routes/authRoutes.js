import { Router } from "express";
import { registrar, login, perfil } from "../controllers/authController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";

const router = Router();

router.post("/registro", verificarToken, permitirRoles("admin"), registrar);
router.post("/login", login);
router.get("/perfil", verificarToken, perfil);

export default router;
