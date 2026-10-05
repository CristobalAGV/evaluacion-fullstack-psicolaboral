import mongoose from "mongoose";
import Archivo from "../models/Archivo.js";

// Content-Disposition con nombre ASCII de respaldo y el original en UTF-8 (RFC 6266).
function contentDisposition(nombreOriginal) {
  const respaldo =
    nombreOriginal
      .normalize("NFD")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/["\\]/g, "_") || "archivo";
  return `attachment; filename="${respaldo}"; filename*=UTF-8''${encodeURIComponent(nombreOriginal)}`;
}

// Devuelve el contenido de un CV o informe guardado en MongoDB. Solo con sesión iniciada.
export async function descargarArchivo(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ mensaje: "Archivo no encontrado" });
    }

    const archivo = await Archivo.findById(id).select("+datos");
    if (!archivo) {
      return res.status(404).json({ mensaje: "Archivo no encontrado" });
    }

    res.set({
      "Content-Type": archivo.mimeType,
      "Content-Length": archivo.datos.length,
      "Content-Disposition": contentDisposition(archivo.nombreOriginal),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return res.send(archivo.datos);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al descargar el archivo", error: error.message });
  }
}
