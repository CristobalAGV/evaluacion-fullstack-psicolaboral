import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { obtenerSolicitud, subirInformeEntrevista } from "../services/solicitudService";
import { listarEvaluaciones, crearEvaluacion, actualizarEvaluacion } from "../services/evaluacionService";
import { apiOrigin } from "../services/api";
import SolicitudFormulario from "../components/SolicitudFormulario";
import EtiquetaPostulacionPublica, { esPostulacionPublica } from "../components/EtiquetaPostulacionPublica";
import SelectorCv from "../components/SelectorCv";
import { useAuth } from "../context/AuthContext";
import { formatearFechaCalendario, hoyLocal } from "../utils/fechas";

const ESTADOS_EVALUACION = ["Pendiente", "En proceso", "Finalizada"];
const campoClases =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function EvaluacionFormulario({ evaluacion, solicitudId, onGuardado, onCancelar }) {
  const esEdicion = Boolean(evaluacion);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-slate-50 border border-slate-200 rounded-md p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Fecha de evaluación
          <input
            type="date"
            value={fechaEvaluacion}
            onChange={(e) => setFechaEvaluacion(e.target.value)}
            className={campoClases}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={campoClases}>
            {ESTADOS_EVALUACION.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Resultado / observaciones
        <textarea
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
          rows={3}
          className={campoClases}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-500 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear evaluación"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-md border border-slate-300 text-slate-600 text-sm px-4 py-2 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const EXTENSIONES_INFORME = [".doc", ".docx"];
const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024;

function EnlaceArchivo({ etiqueta, url }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-700">{etiqueta}</span>
      {url ? (
        <a
          href={`${apiOrigin}${url}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Descargar
        </a>
      ) : (
        <span className="text-sm text-slate-400">Sin archivo</span>
      )}
    </div>
  );
}

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
      const { informeEntrevistaUrl } = await subirInformeEntrevista(solicitudId, archivo);
      onSubido(informeEntrevistaUrl);
      setArchivo(null);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al subir el informe");
    } finally {
      setSubiendo(false);
    }
  }

  const errorArchivo = validar(archivo);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <SelectorCv
        etiqueta={tieneInforme ? "Reemplazar informe de entrevista" : "Subir informe de entrevista"}
        archivo={archivo}
        onChange={setArchivo}
        accept=".doc,.docx"
        textoSeleccionar="Haz clic para seleccionar el informe"
        formatos="Word (DOC o DOCX) · máx. 5MB"
      />
      {(errorArchivo || error) && <p className="text-sm text-red-600">{errorArchivo || error}</p>}
      {archivo && (
        <button
          type="submit"
          disabled={subiendo || Boolean(errorArchivo)}
          className="self-start rounded-md bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-500 disabled:opacity-50"
        >
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

  if (cargando) return <p className="text-sm text-slate-500">Cargando solicitud...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!solicitud) return null;

  // Mismas reglas que aplica el backend: el analista y el admin gestionan la solicitud; las
  // evaluaciones las gestiona el evaluador responsable (o un admin).
  const esResponsable =
    usuario?.rol === "evaluador" && solicitud.profesionalResponsable?._id === usuario.id;
  const puedeGestionarSolicitud = ["analista", "admin"].includes(usuario?.rol);
  const puedeGestionarEvaluaciones = usuario?.rol === "admin" || esResponsable;
  const puedeSubirInforme = puedeGestionarSolicitud || esResponsable;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/panel" className="text-sm text-indigo-600 hover:underline">
          ← Volver al panel
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{solicitud.candidato?.nombre}</h2>
            {esPostulacionPublica(solicitud) && <EtiquetaPostulacionPublica />}
          </div>
          <span className="rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1">
            {solicitud.estado}
          </span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Correo del candidato</dt>
            <dd className="text-slate-900">{solicitud.candidato?.correo}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Teléfono del candidato</dt>
            <dd className="text-slate-900">{solicitud.candidato?.telefono}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Cargo</dt>
            <dd className="text-slate-900">{solicitud.cargo}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Familia de cargo</dt>
            <dd className="text-slate-900">{solicitud.familiaDeCargo?.nombre}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Profesional responsable</dt>
            <dd className="text-slate-900">
              {solicitud.profesionalResponsable?.nombre || (
                <span className="text-amber-700">Sin evaluador asignado</span>
              )}{" "}
              {puedeGestionarSolicitud && (
                <button
                  type="button"
                  onClick={() => setEditandoSolicitud(true)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {solicitud.profesionalResponsable ? "Cambiar" : "Asignar"}
                </button>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Analista que la creó</dt>
            <dd className="text-slate-900">
              {solicitud.analistaId?.nombre ||
                (esPostulacionPublica(solicitud) ? "Enviada por el candidato desde /postular" : "-")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Observaciones</dt>
            <dd className="text-slate-900 whitespace-pre-wrap">{solicitud.observaciones || "-"}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Archivos del candidato</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EnlaceArchivo etiqueta="CV" url={solicitud.cvUrl || solicitud.candidato?.cvUrl} />
          <EnlaceArchivo etiqueta="Informe de entrevista" url={solicitud.candidato?.informeEntrevistaUrl} />
        </div>
        {puedeSubirInforme && (
          <div className="mt-4">
            <SubirInforme
              solicitudId={id}
              tieneInforme={Boolean(solicitud.candidato?.informeEntrevistaUrl)}
              onSubido={(informeEntrevistaUrl) =>
                setSolicitud((anterior) => ({
                  ...anterior,
                  candidato: { ...anterior.candidato, informeEntrevistaUrl },
                }))
              }
            />
          </div>
        )}
      </div>

      {editandoSolicitud && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10"
          onClick={() => setEditandoSolicitud(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SolicitudFormulario
              solicitud={solicitud}
              alGuardar={(actualizada) => {
                // La respuesta del PUT no trae analistaId populado; se conserva el que ya teníamos.
                setSolicitud((anterior) => ({ ...anterior, ...actualizada, analistaId: anterior.analistaId }));
                setEditandoSolicitud(false);
              }}
              alCancelar={() => setEditandoSolicitud(false)}
            />
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Evaluaciones</h3>
          {puedeGestionarEvaluaciones && !mostrarFormularioNueva && (
            <button
              type="button"
              onClick={() => setMostrarFormularioNueva(true)}
              className="rounded-md bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-indigo-500"
            >
              + Nueva evaluación
            </button>
          )}
        </div>

        {mostrarFormularioNueva && (
          <div className="mb-4">
            <EvaluacionFormulario
              solicitudId={id}
              onGuardado={manejarEvaluacionCreada}
              onCancelar={() => setMostrarFormularioNueva(false)}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {evaluaciones.length === 0 && !mostrarFormularioNueva && (
            <p className="text-sm text-slate-400">Todavía no hay evaluaciones registradas.</p>
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
              <div key={evaluacion._id} className="border border-slate-200 rounded-md p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">
                    {formatearFechaCalendario(evaluacion.fechaEvaluacion)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5">
                      {evaluacion.estado}
                    </span>
                    {puedeGestionarEvaluaciones && (
                      <button
                        type="button"
                        onClick={() => setEvaluacionEnEdicion(evaluacion)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{evaluacion.resultado || "-"}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
