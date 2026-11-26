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
import ofertaRoutes from "./routes/ofertaRoutes.js";
import docsRoutes from "./routes/docsRoutes.js";

const app = express();

// En Render la API va detrás de un proxy: así el rate limit ve la IP real del cliente
// (X-Forwarded-For) y no la del proxy.
app.set("trust proxy", 1);

const corsConfigurados = (process.env.CORS_ORIGIN ?? "").split(",").map((origen) => origen.trim()).filter(Boolean);
const corsOrigins = corsConfigurados.length ? corsConfigurados
  : process.env.NODE_ENV === "production" ? []
    : ["http://localhost:5173", "http://127.0.0.1:5173"];

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
app.use("/api/ofertas", ofertaRoutes);
app.use("/api/docs", docsRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ mensaje: `Error al subir el archivo: ${err.message}` });
  }
  if (err.type === "entity.parse.failed") return res.status(400).json({ mensaje: "JSON inválido" });
  if (err.type === "entity.too.large") return res.status(413).json({ mensaje: "Solicitud demasiado grande" });
  console.error("Fallo no controlado en la API.");
  return res.status(500).json({ mensaje: "Error interno" });
});

export default app;
