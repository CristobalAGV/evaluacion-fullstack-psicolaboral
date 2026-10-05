import multer from "multer";
import { TAMANO_MAXIMO_ARCHIVO } from "../utils/validarArchivo.js";

// Los archivos quedan en memoria: se validan sobre el buffer y luego se guardan en MongoDB
// (modelo Archivo). Nada se escribe en el disco del servidor, que en Render es efímero.
const upload = multer({
  storage: multer.memoryStorage(),
  // Sin esto, multer lee el nombre del archivo como latin1 y "Matías.pdf" se guarda mal.
  defParamCharset: "utf8",
  limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 },
});

// Recibe un único archivo en el campo indicado y traduce los errores de multer.
export function recibirArchivo(campo, descripcion) {
  return (req, res, next) => {
    upload.single(campo)(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ mensaje: `${descripcion} supera el tamaño máximo de 5 MB.` });
      }
      return res.status(400).json({ mensaje: `No se pudo procesar ${descripcion.toLowerCase()}.` });
    });
  };
}
