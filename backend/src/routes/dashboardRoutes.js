import { Router } from "express";
import { obtenerDashboard } from "../controllers/dashboardController.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";

const router = Router();

router.get("/", verificarToken, permitirRoles("analista", "evaluador", "admin"), obtenerDashboard);

export default router;
