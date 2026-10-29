import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarSolicitudes, actualizarEstadoSolicitud, eliminarSolicitud } from "../services/solicitudService";
import SolicitudFormulario from "../components/SolicitudFormulario";
import EtiquetaPostulacionPublica, { esPostulacionPublica } from "../components/EtiquetaPostulacionPublica";
import FiltrosPanel from "../components/FiltrosPanel";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import {
  FILTROS_INICIALES,
  filtrarSolicitudes,
  hayFiltrosActivos,
  opcionesUnicas,
} from "../utils/filtrosPanel";

const COLUMNAS = [
  { estado: "Pendiente", siguiente: "En proceso", etiquetaBoton: "Mover a En proceso" },
  { estado: "En proceso", siguiente: "Finalizada", etiquetaBoton: "Marcar finalizada" },
  { estado: "Finalizada", siguiente: null, etiquetaBoton: null },
];

export default function Panel() {
  const { usuario } = useAuth();
  // El evaluador ve el tablero, pero solo gestiona evaluaciones (desde el detalle).
  const puedeGestionar = ["analista", "admin"].includes(usuario?.rol);
  const puedeEliminar = usuario?.rol === "admin";
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizandoId, setActualizandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [solicitudEnEdicion, setSolicitudEnEdicion] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

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

  if (cargando) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Cargando panel...</span>
      </div>
    );
  }

  // Los filtros solo deciden qué tarjetas se ven; el estado de cada solicitud no cambia.
  const visibles = filtrarSolicitudes(solicitudes, filtros);
  const areas = opcionesUnicas(solicitudes, (s) => s.familiaDeCargo?.nombre);
  const responsables = opcionesUnicas(solicitudes, (s) => s.profesionalResponsable?.nombre);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 mb-0">Panel de solicitudes</h1>
        {puedeGestionar && (
          <Link to="/solicitudes/nueva" className="btn btn-primary">
            + Nueva solicitud
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <FiltrosPanel
        filtros={filtros}
        areas={areas}
        responsables={responsables}
        onCambiar={(campo, valor) => setFiltros((actuales) => ({ ...actuales, [campo]: valor }))}
        onLimpiar={() => setFiltros(FILTROS_INICIALES)}
      />

      <p className="small text-secondary mb-3">
        Mostrando {visibles.length} de {solicitudes.length} solicitudes
      </p>
      {solicitudes.length > 0 && visibles.length === 0 && hayFiltrosActivos(filtros) && (
        <div className="alert alert-info" role="alert">
          Ninguna solicitud coincide con los filtros
        </div>
      )}

      <div className="row g-3">
        {COLUMNAS.map((columna) => {
          const enColumna = visibles.filter((s) => s.estado === columna.estado);
          return (
            <div key={columna.estado} className="col-12 col-lg-4">
              <div className="bg-body-secondary border rounded p-3 h-100">
                <h2 className="h6 fw-semibold mb-3">
                  {columna.estado} ({enColumna.length})
                </h2>
                <div className="d-flex flex-column gap-2">
                  {enColumna.map((s) => (
                    <div key={s._id} className="card shadow-sm">
                      <div className="card-body p-3 d-flex flex-column gap-1">
                        {esPostulacionPublica(s) && <EtiquetaPostulacionPublica />}
                        <Link to={`/solicitudes/${s._id}`} className="fw-semibold text-body text-decoration-none">
                          {s.candidato?.nombre}
                        </Link>
                        <p className="small text-secondary mb-0">{s.cargo}</p>
                        <p className="small text-secondary mb-0">{s.familiaDeCargo?.nombre}</p>
                        {s.profesionalResponsable?.nombre ? (
                          <p className="small text-secondary mb-0">Responsable: {s.profesionalResponsable.nombre}</p>
                        ) : (
                          <span className="badge text-bg-warning align-self-start">Sin evaluador asignado</span>
                        )}
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          <Link to={`/solicitudes/${s._id}`} className="btn btn-sm btn-dark">
                            Ver detalle
                          </Link>
                          {puedeGestionar && (
                            <>
                              {s.profesionalResponsable && (
                                <button
                                  type="button"
                                  onClick={() => setSolicitudEnEdicion(s)}
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  Editar
                                </button>
                              )}
                              {puedeEliminar && (
                                <button
                                  type="button"
                                  disabled={eliminandoId === s._id}
                                  onClick={() => manejarEliminar(s)}
                                  className="btn btn-sm btn-outline-danger"
                                >
                                  {eliminandoId === s._id ? "Eliminando..." : "Eliminar"}
                                </button>
                              )}
                              {/* Sin evaluador no se puede avanzar de estado: primero hay que asignarlo. */}
                              {!s.profesionalResponsable ? (
                                <button
                                  type="button"
                                  onClick={() => setSolicitudEnEdicion(s)}
                                  className="btn btn-sm btn-warning"
                                >
                                  Asignar evaluador
                                </button>
                              ) : (
                                columna.siguiente && (
                                  <button
                                    type="button"
                                    disabled={actualizandoId === s._id}
                                    onClick={() => moverEstado(s._id, columna.siguiente)}
                                    className="btn btn-sm btn-primary"
                                  >
                                    {actualizandoId === s._id ? "Moviendo..." : columna.etiquetaBoton}
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {enColumna.length === 0 && <p className="small text-secondary mb-0">Sin solicitudes</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {solicitudEnEdicion && (
        <Modal etiqueta="Editar solicitud" tamano="modal-lg" onCerrar={() => setSolicitudEnEdicion(null)}>
          <SolicitudFormulario
            solicitud={solicitudEnEdicion}
            alGuardar={manejarSolicitudEditada}
            alCancelar={() => setSolicitudEnEdicion(null)}
          />
        </Modal>
      )}
    </div>
  );
}
