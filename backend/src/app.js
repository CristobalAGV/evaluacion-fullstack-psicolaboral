import express from "express";
import cors from "cors";
import multer from "multer";
import authRoutes from "./routes/authRoutes.js";
import familiaRoutes from "./routes/familiaRoutes.js";
import solicitudRoutes from "./routes/solicitudRoutes.js";
import evaluacionRoutes from "./routes/evaluacionRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import { UPLOADS_DIR } from "./middleware/upload.js";

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origen) => origen.trim())
  : "*";

app.use(cors({ origin: corsOrigins }));
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/api/health", (req, res) => {
  res.json({ estado: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/familias", familiaRoutes);
app.use("/api/solicitudes", solicitudRoutes);
app.use("/api/evaluaciones", evaluacionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/usuarios", usuarioRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ mensaje: `Error al subir el archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ mensaje: err.message || "Solicitud invalida" });
  }
  next();
});

export default app;
