import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { obtenerSolicitud } from "../services/solicitudService";
import { listarEvaluaciones, crearEvaluacion, actualizarEvaluacion } from "../services/evaluacionService";
import { apiOrigin } from "../services/api";

const ESTADOS_EVALUACION = ["Pendiente", "En proceso", "Finalizada"];
const campoClases =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function EvaluacionFormulario({ evaluacion, solicitudId, onGuardado, onCancelar }) {
  const esEdicion = Boolean(evaluacion);
  const [fechaEvaluacion, setFechaEvaluacion] = useState(
    evaluacion?.fechaEvaluacion ? evaluacion.fechaEvaluacion.slice(0, 10) : new Date().toISOString().slice(0, 10)
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
      setError(err.response?.data?.mensaje || "Error al guardar la evaluacion");
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

export default function SolicitudDetalle() {
  const { id } = useParams();
  const [solicitud, setSolicitud] = useState(null);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarFormularioNueva, setMostrarFormularioNueva] = useState(false);
  const [evaluacionEnEdicion, setEvaluacionEnEdicion] = useState(null);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargarDatos() {
    setCargando(true);
    setError("");
    try {
      const [solicitudData, evaluacionesData] = await Promise.all([
        obtenerSolicitud(id),
        listarEvaluaciones(id),
      ]);
      setSolicitud(solicitudData);
      setEvaluaciones(evaluacionesData);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al cargar la solicitud");
    } finally {
      setCargando(false);
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/panel" className="text-sm text-indigo-600 hover:underline">
          ← Volver al panel
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{solicitud.candidato?.nombre}</h2>
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
            <dd className="text-slate-900">{solicitud.profesionalResponsable?.nombre || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Analista que la creó</dt>
            <dd className="text-slate-900">{solicitud.analistaId?.nombre || "-"}</dd>
          </div>
          {solicitud.cvUrl && (
            <div>
              <dt className="text-slate-500">CV</dt>
              <dd>
                <a
                  href={`${apiOrigin}${solicitud.cvUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  ver archivo
                </a>
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Observaciones</dt>
            <dd className="text-slate-900 whitespace-pre-wrap">{solicitud.observaciones || "-"}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Evaluaciones</h3>
          {!mostrarFormularioNueva && (
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
                    {new Date(evaluacion.fechaEvaluacion).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5">
                      {evaluacion.estado}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEvaluacionEnEdicion(evaluacion)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Editar
                    </button>
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
