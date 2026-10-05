import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const TIPOS_PERMITIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const nombreBase = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    cb(null, `${Date.now()}-${nombreBase}${extension}`);
  },
});

function filtroArchivo(req, file, cb) {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    return cb(new Error("Formato de CV no permitido. Usa PDF, DOC o DOCX."));
  }
  cb(null, true);
}

export const uploadCv = multer({
  storage,
  fileFilter: filtroArchivo,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// El informe de entrevista queda en memoria hasta validar su contenido (ver utils/validarArchivo.js).
const uploadInforme = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
});

export function recibirInformeEntrevista(req, res, next) {
  uploadInforme.single("informe")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ mensaje: "El informe supera el tamaño máximo de 5 MB." });
    }
    return res.status(400).json({ mensaje: "No se pudo procesar el archivo del informe." });
  });
}

export async function eliminarArchivo(rutaAbsoluta) {
  try {
    await fs.promises.unlink(rutaAbsoluta);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
