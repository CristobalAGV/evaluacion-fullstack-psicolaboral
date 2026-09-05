import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarSolicitudes, actualizarEstadoSolicitud, eliminarSolicitud } from "../services/solicitudService";
import SolicitudFormulario from "../components/SolicitudFormulario";

const COLUMNAS = [
  { estado: "pendiente", titulo: "Pendiente", siguiente: "en_proceso", etiquetaBoton: "Mover a en proceso" },
  { estado: "en_proceso", titulo: "En proceso", siguiente: "completada", etiquetaBoton: "Marcar completada" },
  { estado: "completada", titulo: "Completada", siguiente: null, etiquetaBoton: null },
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
      `¿Eliminar la solicitud de ${s.candidato?.nombre} (${s.cargo})? Esta accion no se puede deshacer.`
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

  if (cargando) return <p>Cargando panel...</p>;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Panel de solicitudes</h2>
        <Link to="/solicitudes/nueva">+ Nueva solicitud</Link>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="kanban">
        {COLUMNAS.map((columna) => (
          <div key={columna.estado} className="kanban-columna">
            <h3>{columna.titulo}</h3>
            <div className="kanban-tarjetas">
              {solicitudes
                .filter((s) => s.estado === columna.estado)
                .map((s) => (
                  <div key={s._id} className="tarjeta">
                    <p className="tarjeta-nombre">{s.candidato?.nombre}</p>
                    <p className="tarjeta-cargo">{s.cargo}</p>
                    <p className="tarjeta-familia">{s.familiaDeCargo?.nombre}</p>
                    <div className="tarjeta-acciones">
                      <button type="button" className="boton-secundario" onClick={() => setSolicitudEnEdicion(s)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="boton-peligro"
                        disabled={eliminandoId === s._id}
                        onClick={() => manejarEliminar(s)}
                      >
                        {eliminandoId === s._id ? "Eliminando..." : "Eliminar"}
                      </button>
                      {columna.siguiente && (
                        <button
                          type="button"
                          disabled={actualizandoId === s._id}
                          onClick={() => moverEstado(s._id, columna.siguiente)}
                        >
                          {actualizandoId === s._id ? "Moviendo..." : columna.etiquetaBoton}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {solicitudes.filter((s) => s.estado === columna.estado).length === 0 && (
                <p className="kanban-vacio">Sin solicitudes</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {solicitudEnEdicion && (
        <div className="modal-overlay" onClick={() => setSolicitudEnEdicion(null)}>
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
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
