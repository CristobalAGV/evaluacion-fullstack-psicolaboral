import { useEffect, useState } from "react";
import { listarFamilias } from "../services/familiaService";
import { listarUsuarios } from "../services/usuarioService";
import { crearSolicitud, actualizarSolicitud } from "../services/solicitudService";
import { apiOrigin } from "../services/api";

const campoClases =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function SolicitudFormulario({ solicitud, alGuardar, alCancelar }) {
  const esEdicion = Boolean(solicitud);

  const [familias, setFamilias] = useState([]);
  const [evaluadores, setEvaluadores] = useState([]);
  const [candidatoNombre, setCandidatoNombre] = useState(solicitud?.candidato?.nombre || "");
  const [candidatoCorreo, setCandidatoCorreo] = useState(solicitud?.candidato?.correo || "");
  const [candidatoTelefono, setCandidatoTelefono] = useState(solicitud?.candidato?.telefono || "");
  const [familiaDeCargo, setFamiliaDeCargo] = useState(solicitud?.familiaDeCargo?._id || "");
  const [cargo, setCargo] = useState(solicitud?.cargo || "");
  const [observaciones, setObservaciones] = useState(solicitud?.observaciones || "");
  const [profesionalResponsable, setProfesionalResponsable] = useState(
    solicitud?.profesionalResponsable?._id || ""
  );
  const [cv, setCv] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => {
    Promise.all([listarFamilias(), listarUsuarios("evaluador")])
      .then(([familiasData, evaluadoresData]) => {
        setFamilias(familiasData);
        setEvaluadores(evaluadoresData);
        if (!esEdicion && familiasData.length > 0) setFamiliaDeCargo(familiasData[0]._id);
        if (!esEdicion && evaluadoresData.length > 0) setProfesionalResponsable(evaluadoresData[0]._id);
      })
      .catch(() => setError("No se pudieron cargar las familias de cargo o los evaluadores"))
      .finally(() => setCargandoDatos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    setCargando(true);
    try {
      const datos = {
        candidatoNombre,
        candidatoCorreo,
        candidatoTelefono,
        familiaDeCargo,
        cargo,
        observaciones,
        profesionalResponsable,
        cv,
      };
      const resultado = esEdicion
        ? await actualizarSolicitud(solicitud._id, datos)
        : await crearSolicitud(datos);
      alGuardar(resultado);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al guardar la solicitud");
    } finally {
      setCargando(false);
    }
  }

  if (cargandoDatos) return <p className="text-sm text-slate-500">Cargando datos del formulario...</p>;

  const sinDatosBase = familias.length === 0 || evaluadores.length === 0;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        {esEdicion ? "Editar solicitud" : "Nueva solicitud"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-2">
            Nombre del candidato
            <input
              type="text"
              value={candidatoNombre}
              onChange={(e) => setCandidatoNombre(e.target.value)}
              required
              className={campoClases}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Correo del candidato
            <input
              type="email"
              value={candidatoCorreo}
              onChange={(e) => setCandidatoCorreo(e.target.value)}
              required
              className={campoClases}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Teléfono del candidato
            <input
              type="tel"
              value={candidatoTelefono}
              onChange={(e) => setCandidatoTelefono(e.target.value)}
              required
              className={campoClases}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Familia de cargo
          <select
            value={familiaDeCargo}
            onChange={(e) => setFamiliaDeCargo(e.target.value)}
            required
            className={campoClases}
          >
            {familias.map((familia) => (
              <option key={familia._id} value={familia._id}>
                {familia.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Cargo
          <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} required className={campoClases} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Profesional responsable (evaluador)
          <select
            value={profesionalResponsable}
            onChange={(e) => setProfesionalResponsable(e.target.value)}
            required
            className={campoClases}
          >
            {evaluadores.map((evaluador) => (
              <option key={evaluador._id} value={evaluador._id}>
                {evaluador.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Observaciones
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className={campoClases}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          {esEdicion ? "Reemplazar CV (opcional, PDF/DOC/DOCX)" : "CV (opcional, PDF/DOC/DOCX)"}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setCv(e.target.files[0] || null)}
            className="text-sm"
          />
        </label>
        {esEdicion && solicitud.cvUrl && (
          <p className="text-sm text-slate-600 -mt-2">
            CV actual:{" "}
            <a href={`${apiOrigin}${solicitud.cvUrl}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              ver archivo
            </a>
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={cargando || sinDatosBase}
            className="flex-1 rounded-md bg-indigo-600 text-white font-medium py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {cargando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear solicitud"}
          </button>
          {alCancelar && (
            <button
              type="button"
              onClick={alCancelar}
              disabled={cargando}
              className="rounded-md border border-indigo-600 text-indigo-600 font-medium px-4 py-2 text-sm hover:bg-indigo-50"
            >
              Cancelar
            </button>
          )}
        </div>

        {familias.length === 0 && (
          <p className="text-sm text-red-600">No hay familias de cargo cargadas. Corre el seed del backend.</p>
        )}
        {evaluadores.length === 0 && (
          <p className="text-sm text-red-600">
            No hay usuarios con rol "evaluador" registrados todavía. Registra uno primero.
          </p>
        )}
      </form>
    </div>
  );
}
