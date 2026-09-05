import { useEffect, useState } from "react";
import { listarFamilias } from "../services/familiaService";
import { crearSolicitud, actualizarSolicitud } from "../services/solicitudService";
import { apiOrigin } from "../services/api";

export default function SolicitudFormulario({ solicitud, alGuardar, alCancelar }) {
  const esEdicion = Boolean(solicitud);

  const [familias, setFamilias] = useState([]);
  const [candidato, setCandidato] = useState(solicitud?.candidato?.nombre || "");
  const [familiaDeCargo, setFamiliaDeCargo] = useState(solicitud?.familiaDeCargo?._id || "");
  const [cargo, setCargo] = useState(solicitud?.cargo || "");
  const [cv, setCv] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoFamilias, setCargandoFamilias] = useState(true);

  useEffect(() => {
    listarFamilias()
      .then((data) => {
        setFamilias(data);
        if (!esEdicion && data.length > 0) setFamiliaDeCargo(data[0]._id);
      })
      .catch(() => setError("No se pudieron cargar las familias de cargo"))
      .finally(() => setCargandoFamilias(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!esEdicion && !cv) {
      setError("Debes adjuntar el CV del candidato");
      return;
    }

    setCargando(true);
    try {
      const datos = { candidato, familiaDeCargo, cargo, cv };
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

  return (
    <div className="auth-form">
      <h2>{esEdicion ? "Editar solicitud" : "Nueva solicitud"}</h2>
      {cargandoFamilias ? (
        <p>Cargando familias de cargo...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            Nombre del candidato
            <input type="text" value={candidato} onChange={(e) => setCandidato(e.target.value)} required />
          </label>
          <label>
            Familia de cargo
            <select value={familiaDeCargo} onChange={(e) => setFamiliaDeCargo(e.target.value)} required>
              {familias.map((familia) => (
                <option key={familia._id} value={familia._id}>
                  {familia.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cargo
            <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} required />
          </label>
          <label>
            {esEdicion ? "Reemplazar CV (opcional, PDF/DOC/DOCX)" : "CV (PDF, DOC o DOCX)"}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCv(e.target.files[0] || null)}
              required={!esEdicion}
            />
          </label>
          {esEdicion && solicitud.cvUrl && (
            <p className="cv-actual">
              CV actual:{" "}
              <a href={`${apiOrigin}${solicitud.cvUrl}`} target="_blank" rel="noreferrer">
                ver archivo
              </a>
            </p>
          )}
          {error && <p className="error">{error}</p>}
          <div className="form-acciones">
            <button type="submit" disabled={cargando || familias.length === 0}>
              {cargando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear solicitud"}
            </button>
            {alCancelar && (
              <button type="button" className="boton-secundario" onClick={alCancelar} disabled={cargando}>
                Cancelar
              </button>
            )}
          </div>
          {familias.length === 0 && (
            <p className="error">No hay familias de cargo cargadas. Corre el seed del backend.</p>
          )}
        </form>
      )}
    </div>
  );
}
