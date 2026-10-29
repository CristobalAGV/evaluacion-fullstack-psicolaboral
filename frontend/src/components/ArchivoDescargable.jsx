import { useState } from "react";
import { descargarArchivo, mensajeDeErrorDescarga } from "../services/archivoService";

// Fila con un archivo del candidato y su botón de descarga (con token).
// archivo: metadatos poblados ({ _id, nombreOriginal }) o solo el id.
// rutaAntigua: ruta en disco de datos anteriores a MongoDB; ese archivo ya no existe.
export default function ArchivoDescargable({ etiqueta, archivo, rutaAntigua }) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  const archivoId = archivo?._id ?? archivo;
  const nombre = archivo?.nombreOriginal;

  async function handleDescargar() {
    setError("");
    setDescargando(true);
    try {
      await descargarArchivo(archivoId, nombre || etiqueta);
    } catch (err) {
      setError((await mensajeDeErrorDescarga(err)) || "No se pudo descargar el archivo");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="border rounded px-3 py-2">
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div className="overflow-hidden">
          <span className="small">{etiqueta}</span>
          {nombre && <p className="small text-secondary text-truncate mb-0">{nombre}</p>}
        </div>
        {archivoId ? (
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="btn btn-outline-primary btn-sm flex-shrink-0"
          >
            {descargando ? "Descargando..." : "Descargar"}
          </button>
        ) : rutaAntigua ? (
          <span
            className="small text-warning-emphasis flex-shrink-0"
            title="Se guardó en el disco del servidor y ya no existe"
          >
            Archivo no disponible
          </span>
        ) : (
          <span className="small text-secondary flex-shrink-0">Sin archivo</span>
        )}
      </div>
      {error && <p className="small text-danger mt-1 mb-0">{error}</p>}
    </div>
  );
}
