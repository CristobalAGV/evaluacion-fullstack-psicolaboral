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
    <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm text-slate-700">{etiqueta}</span>
          {nombre && <p className="truncate text-xs text-slate-400">{nombre}</p>}
        </div>
        {archivoId ? (
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="shrink-0 text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50"
          >
            {descargando ? "Descargando..." : "Descargar"}
          </button>
        ) : rutaAntigua ? (
          <span className="shrink-0 text-sm text-amber-700" title="Se guardó en el disco del servidor y ya no existe">
            Archivo no disponible
          </span>
        ) : (
          <span className="shrink-0 text-sm text-slate-400">Sin archivo</span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
