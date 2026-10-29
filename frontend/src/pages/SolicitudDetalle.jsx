import { useEffect, useId, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { obtenerSolicitud, subirInformeEntrevista } from "../services/solicitudService";
import { listarEvaluaciones, crearEvaluacion, actualizarEvaluacion } from "../services/evaluacionService";
import InformePsicolaboral from "../components/InformePsicolaboral";
import SolicitudFormulario from "../components/SolicitudFormulario";
import EtiquetaPostulacionPublica, { esPostulacionPublica } from "../components/EtiquetaPostulacionPublica";
import SelectorCv from "../components/SelectorCv";
import ArchivoDescargable from "../components/ArchivoDescargable";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { formatearFechaCalendario, hoyLocal } from "../utils/fechas";

const ESTADOS_EVALUACION = ["Pendiente", "En proceso", "Finalizada"];
// Mismos colores que las columnas del panel y el dashboard.
const COLOR_ESTADO = { Pendiente: "warning", "En proceso": "primary", Finalizada: "success" };

function InsigniaEstado({ estado }) {
  return <span className={`badge text-bg-${COLOR_ESTADO[estado] || "secondary"}`}>{estado}</span>;
}

function EvaluacionFormulario({ evaluacion, solicitudId, onGuardado, onCancelar }) {
  const esEdicion = Boolean(evaluacion);
  const prefijoId = useId();
  const [fechaEvaluacion, setFechaEvaluacion] = useState(
    evaluacion?.fechaEvaluacion ? evaluacion.fechaEvaluacion.slice(0, 10) : hoyLocal()
  );
  const [resultado, setResultado] = useState(evaluacion?.resultado || "");
  const [estado, setEstado] = useState(evaluacion?.estado || "Pendiente");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const datos = { fechaEvaluacion, resultado, estado };
      const resultadoGuardado = esEdicion
        ? await actualizarEvaluacion(evaluacion._id, datos)
        : await crearEvaluacion(solicitudId, datos);
      onGuardado(resultadoGuardado);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al guardar la evaluación");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded bg-body-tertiary p-3">
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <label htmlFor={`${prefijoId}-fecha`} className="form-label">
            Fecha de evaluación
          </label>
          <input
            id={`${prefijoId}-fecha`}
            type="date"
            value={fechaEvaluacion}
            onChange={(e) => setFechaEvaluacion(e.target.value)}
            className="form-control"
          />
        </div>
        <div className="col-12 col-sm-6">
          <label htmlFor={`${prefijoId}-estado`} className="form-label">
            Estado
          </label>
          <select
            id={`${prefijoId}-estado`}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="form-select"
          >
            {ESTADOS_EVALUACION.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <label htmlFor={`${prefijoId}-resultado`} className="form-label">
            Resultado / observaciones
          </label>
          <textarea
            id={`${prefijoId}-resultado`}
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            rows={3}
            className="form-control"
          />
        </div>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        )}
        <div className="col-12 d-flex gap-2">
          <button type="submit" disabled={guardando} className="btn btn-primary">
            {guardando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear evaluación"}
          </button>
          <button type="button" onClick={onCancelar} disabled={guardando} className="btn btn-outline-secondary">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

const EXTENSIONES_INFORME = [".doc", ".docx"];
const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024;

function SubirInforme({ solicitudId, tieneInforme, onSubido }) {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  function validar(seleccionado) {
    if (!seleccionado) return "";
    const nombre = seleccionado.name.toLowerCase();
    if (!EXTENSIONES_INFORME.some((extension) => nombre.endsWith(extension))) {
      return "El informe debe ser un archivo Word (DOC o DOCX).";
    }
    if (seleccionado.size > TAMANO_MAXIMO_ARCHIVO) return "El informe supera el tamaño máximo de 5 MB.";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubiendo(true);
    try {
      const { informeArchivo } = await subirInformeEntrevista(solicitudId, archivo);
      onSubido(informeArchivo);
      setArchivo(null);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al subir el informe");
    } finally {
      setSubiendo(false);
    }
  }

  const errorArchivo = validar(archivo);

  return (
    <form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
      <SelectorCv
        etiqueta={tieneInforme ? "Reemplazar informe de entrevista" : "Subir informe de entrevista"}
        archivo={archivo}
        onChange={setArchivo}
        accept=".doc,.docx"
        textoSeleccionar="Haz clic para seleccionar el informe"
        formatos="Word (DOC o DOCX) · máx. 5MB"
      />
      {(errorArchivo || error) && (
        <div className="alert alert-danger py-2 mb-0" role="alert">
          {errorArchivo || error}
        </div>
      )}
      {archivo && (
        <button
          type="submit"
          disabled={subiendo || Boolean(errorArchivo)}
          className="btn btn-primary align-self-start"
        >
          {subiendo && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {subiendo ? "Subiendo..." : "Guardar informe"}
        </button>
      )}
    </form>
  );
}

export default function SolicitudDetalle() {
  const { usuario } = useAuth();
  const { id } = useParams();
  const [solicitud, setSolicitud] = useState(null);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarFormularioNueva, setMostrarFormularioNueva] = useState(false);
  const [evaluacionEnEdicion, setEvaluacionEnEdicion] = useState(null);
  const [editandoSolicitud, setEditandoSolicitud] = useState(false);

  useEffect(() => {
    // Si el efecto se repite (cambio de id o doble montaje de StrictMode), la respuesta de la
    // carga anterior se descarta: si llegara tarde, borraría una evaluación recién creada.
    let vigente = true;
    cargarDatos(() => vigente);
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargarDatos(esVigente) {
    setCargando(true);
    setError("");
    try {
      const [solicitudData, evaluacionesData] = await Promise.all([
        obtenerSolicitud(id),
        listarEvaluaciones(id),
      ]);
      if (!esVigente()) return;
      setSolicitud(solicitudData);
      setEvaluaciones(evaluacionesData);
    } catch (err) {
      if (!esVigente()) return;
      setError(err.response?.data?.mensaje || "Error al cargar la solicitud");
    } finally {
      if (esVigente()) setCargando(false);
    }
  }

  function manejarEvaluacionCreada(nueva) {
    setEvaluaciones((prev) => [nueva, ...prev]);
    setMostrarFormularioNueva(false);
  }

  function manejarEvaluacionEditada(actualizada) {
    setEvaluaciones((prev) => prev.map((e) => (e._id === actualizada._id ? actualizada : e)));
    setEvaluacionEnEdicion(null);
  }

  if (cargando) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Cargando solicitud...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }
  if (!solicitud) return null;

  // Mismas reglas que aplica el backend: el analista y el admin gestionan la solicitud; las
  // evaluaciones las gestiona el evaluador responsable (o un admin).
  const esResponsable =
    usuario?.rol === "evaluador" && solicitud.profesionalResponsable?._id === usuario.id;
  const puedeGestionarSolicitud = ["analista", "admin"].includes(usuario?.rol);
  const puedeGestionarEvaluaciones = usuario?.rol === "admin" || esResponsable;
  const puedeSubirInforme = puedeGestionarSolicitud || esResponsable;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h1 className="h3 mb-0">{solicitud.candidato?.nombre}</h1>
          {esPostulacionPublica(solicitud) && <EtiquetaPostulacionPublica />}
          <InsigniaEstado estado={solicitud.estado} />
        </div>
        <Link to="/panel" className="btn btn-outline-secondary btn-sm">
          ← Volver al panel
        </Link>
      </div>

      <div className="row g-3">
        {/* En móvil va primero (datos y archivos); en escritorio queda a la derecha. */}
        <div className="col-12 col-lg-4 order-lg-2 d-flex flex-column gap-3">
          <section className="card shadow-sm">
            <div className="card-header">
              <h2 className="h6 fw-semibold mb-0">Datos de la solicitud</h2>
            </div>
            <dl className="list-group list-group-flush mb-0">
              <div className="list-group-item">
                <dt className="small text-secondary fw-normal">Correo del candidato</dt>
                <dd className="mb-0 text-break">{solicitud.candidato?.correo}</dd>
              </div>
              <div className="list-group-item">
                <dt className="small text-secondary fw-normal">Teléfono del candidato</dt>
                <dd className="mb-0">{solicitud.candidato?.telefono}</dd>
              </div>
              <div className="list-group-item">
                <dt className="small text-secondary fw-normal">Cargo</dt>
                <dd className="mb-0">{solicitud.cargo}</dd>
              </div>
              <div className="list-group-item">
                <dt className="small text-secondary fw-normal">Familia de cargo</dt>
                <dd className="mb-0">{solicitud.familiaDeCargo?.nombre}</dd>
              </div>
              <div className="list-group-item">
                <dt className="small text-secondary fw-normal">Profesional responsable</dt>
                <dd className="mb-0">
                  {solicitud.profesionalResponsable?.nombre || (
                    <span className="badge text-bg-warning">Sin evaluador asignado</span>
                  )}{" "}
                  {puedeGestionarSolicitud && (
                    <button
                      type="button"
                      onClick={() => setEditandoSolicitud(true)}
                      className="btn btn-link btn-sm p-0 align-baseline"
                    >
                      {solicitud.profesionalResponsable ? "Cambiar" : "Asignar"}
                    </button>
                  )}
                </dd>
              </div>
              <div className="list-group-item">
                <dt className="small text-secondary fw-normal">Origen</dt>
                <dd className="mb-0">
                  {esPostulacionPublica(solicitud)
                    ? "Postulación pública del candidato"
                    : `Creada por ${solicitud.analistaId?.nombre || "el equipo"}`}
                </dd>
              </div>
              <div className="list-group-item">
                <dt className="small text-secondary fw-normal">Observaciones</dt>
                <dd className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {solicitud.observaciones || "-"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card shadow-sm">
            <div className="card-header">
              <h2 className="h6 fw-semibold mb-0">Archivos del candidato</h2>
            </div>
            <div className="card-body d-flex flex-column gap-3">
              <ArchivoDescargable
                etiqueta="CV"
                archivo={solicitud.candidato?.cvArchivoId}
                rutaAntigua={solicitud.candidato?.cvUrl || solicitud.cvUrl}
              />
              <ArchivoDescargable
                etiqueta="Informe de entrevista"
                archivo={solicitud.candidato?.informeArchivoId}
                rutaAntigua={solicitud.candidato?.informeEntrevistaUrl}
              />
              {puedeSubirInforme && (
                <SubirInforme
                  solicitudId={id}
                  tieneInforme={Boolean(solicitud.candidato?.informeArchivoId)}
                  onSubido={(informeArchivo) =>
                    setSolicitud((anterior) => ({
                      ...anterior,
                      candidato: { ...anterior.candidato, informeArchivoId: informeArchivo, informeEntrevistaUrl: "" },
                    }))
                  }
                />
              )}
            </div>
          </section>
        </div>

        <div className="col-12 col-lg-8 order-lg-1 d-flex flex-column gap-3">
          <section className="card shadow-sm">
            <div className="card-header">
              <h2 className="h6 fw-semibold mb-0">Informe psicolaboral</h2>
            </div>
            <div className="card-body">
              <InformePsicolaboral
                solicitudId={id}
                puedeEditar={puedeGestionarEvaluaciones}
                tieneCv={Boolean(solicitud.candidato?.cvArchivoId)}
                tieneInforme={Boolean(solicitud.candidato?.informeArchivoId)}
              />
            </div>
          </section>

          <section className="card shadow-sm">
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h2 className="h6 fw-semibold mb-0">Evaluaciones del evaluador</h2>
              {puedeGestionarEvaluaciones && !mostrarFormularioNueva && (
                <button
                  type="button"
                  onClick={() => setMostrarFormularioNueva(true)}
                  className="btn btn-primary btn-sm"
                >
                  + Nueva evaluación
                </button>
              )}
            </div>
            <div className="card-body d-flex flex-column gap-3">
              {mostrarFormularioNueva && (
                <EvaluacionFormulario
                  solicitudId={id}
                  onGuardado={manejarEvaluacionCreada}
                  onCancelar={() => setMostrarFormularioNueva(false)}
                />
              )}

              {evaluaciones.length === 0 && !mostrarFormularioNueva && (
                <p className="text-secondary mb-0">Todavía no hay evaluaciones registradas.</p>
              )}
              {evaluaciones.map((evaluacion) =>
                evaluacionEnEdicion?._id === evaluacion._id ? (
                  <EvaluacionFormulario
                    key={evaluacion._id}
                    evaluacion={evaluacion}
                    solicitudId={id}
                    onGuardado={manejarEvaluacionEditada}
                    onCancelar={() => setEvaluacionEnEdicion(null)}
                  />
                ) : (
                  <div key={evaluacion._id} className="card">
                    <div className="card-body py-3">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <span className="fw-medium">{formatearFechaCalendario(evaluacion.fechaEvaluacion)}</span>
                        <div className="d-flex align-items-center gap-2">
                          <InsigniaEstado estado={evaluacion.estado} />
                          {puedeGestionarEvaluaciones && (
                            <button
                              type="button"
                              onClick={() => setEvaluacionEnEdicion(evaluacion)}
                              className="btn btn-outline-primary btn-sm"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-secondary mt-2 mb-0" style={{ whiteSpace: "pre-wrap" }}>
                        {evaluacion.resultado || "-"}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>
      </div>

      {editandoSolicitud && (
        <Modal etiqueta="Editar solicitud" tamano="modal-lg" onCerrar={() => setEditandoSolicitud(false)}>
          <SolicitudFormulario
            solicitud={solicitud}
            alGuardar={(actualizada) => {
              // La respuesta del PUT no trae analistaId populado; se conserva el que ya teníamos.
              setSolicitud((anterior) => ({ ...anterior, ...actualizada, analistaId: anterior.analistaId }));
              setEditandoSolicitud(false);
            }}
            alCancelar={() => setEditandoSolicitud(false)}
          />
        </Modal>
      )}
    </div>
  );
}
