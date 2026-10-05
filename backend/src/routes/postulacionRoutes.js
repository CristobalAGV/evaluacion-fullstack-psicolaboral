import { Router } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { crearPostulacion, listarFamiliasPublicas } from "../controllers/postulacionController.js";

// Rutas públicas (sin token) del formulario /postular. Solo exponen los nombres de las
// familias de cargo y la creación de una postulación; nada de otros candidatos ni usuarios.
const router = Router();

const MENSAJE_LIMITE = "Recibimos demasiadas postulaciones desde tu conexión. Inténtalo de nuevo en una hora.";

// Máximo 5 postulaciones aceptadas por hora e IP. Los intentos con errores de validación
// no cuentan, para que un candidato que se equivoca en un campo no quede bloqueado.
const limitePostulaciones = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  skipFailedRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensaje: MENSAJE_LIMITE },
});

// Tope general de intentos (válidos o no), para que no se pueda martillar el endpoint con archivos.
const limiteIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensaje: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." },
});

const limiteLectura = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensaje: "Demasiadas solicitudes. Espera unos minutos." },
});

// El CV queda en memoria hasta validar su contenido; recién entonces se escribe en disco.
const uploadPublico = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 10 * 1024 },
});

function recibirCv(req, res, next) {
  uploadPublico.single("cv")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ mensaje: "El CV supera el tamaño máximo de 5 MB." });
    }
    return res.status(400).json({ mensaje: "No se pudo procesar el formulario. Revisa los datos y el archivo." });
  });
}

router.get("/familias", limiteLectura, listarFamiliasPublicas);
router.post("/", limiteIntentos, limitePostulaciones, recibirCv, crearPostulacion);

export default router;
