import express from "express";
import cors from "cors";
import multer from "multer";
import authRoutes from "./routes/authRoutes.js";
import familiaRoutes from "./routes/familiaRoutes.js";
import solicitudRoutes from "./routes/solicitudRoutes.js";
import evaluacionRoutes from "./routes/evaluacionRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import postulacionRoutes from "./routes/postulacionRoutes.js";
import archivoRoutes from "./routes/archivoRoutes.js";

const app = express();

// En Render la API va detrás de un proxy: así el rate limit ve la IP real del cliente
// (X-Forwarded-For) y no la del proxy.
app.set("trust proxy", 1);

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origen) => origen.trim())
  : "*";

// Content-Disposition expuesto para que el frontend lea el nombre del archivo al descargar.
app.use(cors({ origin: corsOrigins, exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ estado: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/familias", familiaRoutes);
app.use("/api/solicitudes", solicitudRoutes);
app.use("/api/evaluaciones", evaluacionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/postulaciones", postulacionRoutes);
app.use("/api/archivos", archivoRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ mensaje: `Error al subir el archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ mensaje: err.message || "Solicitud inválida" });
  }
  next();
});

export default app;
