import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarSolicitudes, actualizarEstadoSolicitud, eliminarSolicitud } from "../services/solicitudService";
import SolicitudFormulario from "../components/SolicitudFormulario";

const COLUMNAS = [
  { estado: "Pendiente", siguiente: "En proceso", etiquetaBoton: "Mover a en proceso" },
  { estado: "En proceso", siguiente: "Finalizada", etiquetaBoton: "Marcar finalizada" },
  { estado: "Finalizada", siguiente: null, etiquetaBoton: null },
];

export default function Panel() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizandoId, setActualizandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [solicitudEnEdicion, setSolicitudEnEdicion] = useState(null);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    setCargando(true);
    setError("");
    try {
      const data = await listarSolicitudes();
      setSolicitudes(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al cargar las solicitudes");
    } finally {
      setCargando(false);
    }
  }

  async function moverEstado(id, siguienteEstado) {
    setActualizandoId(id);
    try {
      const actualizada = await actualizarEstadoSolicitud(id, siguienteEstado);
      setSolicitudes((prev) => prev.map((s) => (s._id === id ? actualizada : s)));
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al actualizar la solicitud");
    } finally {
      setActualizandoId(null);
    }
  }

  async function manejarEliminar(s) {
    const confirmado = window.confirm(
      `¿Eliminar la solicitud de ${s.candidato?.nombre} (${s.cargo})? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setEliminandoId(s._id);
    try {
      await eliminarSolicitud(s._id);
      setSolicitudes((prev) => prev.filter((sol) => sol._id !== s._id));
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al eliminar la solicitud");
    } finally {
      setEliminandoId(null);
    }
  }

  function manejarSolicitudEditada(actualizada) {
    setSolicitudes((prev) => prev.map((s) => (s._id === actualizada._id ? actualizada : s)));
    setSolicitudEnEdicion(null);
  }

  if (cargando) return <p className="text-sm text-slate-500">Cargando panel...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Panel de solicitudes</h2>
        <Link
          to="/solicitudes/nueva"
          className="rounded-md bg-indigo-600 text-white font-medium px-4 py-2 text-sm hover:bg-indigo-500"
        >
          + Nueva solicitud
        </Link>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNAS.map((columna) => (
          <div key={columna.estado} className="bg-slate-100 border border-slate-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{columna.estado}</h3>
            <div className="flex flex-col gap-2.5">
              {solicitudes
                .filter((s) => s.estado === columna.estado)
                .map((s) => (
                  <div key={s._id} className="bg-white border border-slate-200 rounded-md p-3 flex flex-col gap-1 shadow-sm">
                    <Link to={`/solicitudes/${s._id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                      {s.candidato?.nombre}
                    </Link>
                    <p className="text-xs text-slate-500">{s.cargo}</p>
                    <p className="text-xs text-slate-500">{s.familiaDeCargo?.nombre}</p>
                    {s.profesionalResponsable?.nombre && (
                      <p className="text-xs text-slate-400">Responsable: {s.profesionalResponsable.nombre}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Link
                        to={`/solicitudes/${s._id}`}
                        className="rounded bg-slate-700 text-white text-xs px-2 py-1 hover:bg-slate-600"
                      >
                        Ver detalle
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSolicitudEnEdicion(s)}
                        className="rounded border border-indigo-600 text-indigo-600 text-xs px-2 py-1 hover:bg-indigo-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={eliminandoId === s._id}
                        onClick={() => manejarEliminar(s)}
                        className="rounded border border-red-600 text-red-600 text-xs px-2 py-1 hover:bg-red-50 disabled:opacity-50"
                      >
                        {eliminandoId === s._id ? "Eliminando..." : "Eliminar"}
                      </button>
                      {columna.siguiente && (
                        <button
                          type="button"
                          disabled={actualizandoId === s._id}
                          onClick={() => moverEstado(s._id, columna.siguiente)}
                          className="rounded bg-indigo-600 text-white text-xs px-2 py-1 hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {actualizandoId === s._id ? "Moviendo..." : columna.etiquetaBoton}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {solicitudes.filter((s) => s.estado === columna.estado).length === 0 && (
                <p className="text-xs text-slate-400">Sin solicitudes</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {solicitudEnEdicion && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10"
          onClick={() => setSolicitudEnEdicion(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SolicitudFormulario
              solicitud={solicitudEnEdicion}
              alGuardar={manejarSolicitudEditada}
              alCancelar={() => setSolicitudEnEdicion(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
