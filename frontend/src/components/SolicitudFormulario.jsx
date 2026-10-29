import { useEffect, useState } from "react";
import { listarFamilias } from "../services/familiaService";
import { listarUsuarios } from "../services/usuarioService";
import { crearSolicitud, actualizarSolicitud } from "../services/solicitudService";
import { useValidacionFormulario } from "../hooks/useValidacionFormulario";
import CampoArchivo from "./CampoArchivo";
import ArchivoDescargable from "./ArchivoDescargable";

const TELEFONO_REGEX = /^\+?56\s?9\s?\d{4}\s?\d{4}$/;
const MENSAJE_TELEFONO = "Ingresa un celular chileno válido: +56 9 1234 5678";

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
  const { mensajes, validar, limpiar } = useValidacionFormulario();

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

    if (!validar(e.currentTarget)) return;
    if (!TELEFONO_REGEX.test(candidatoTelefono.trim())) {
      setError(MENSAJE_TELEFONO);
      return;
    }

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

  if (cargandoDatos) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Cargando datos del formulario...</span>
      </div>
    );
  }

  const sinDatosBase = familias.length === 0 || evaluadores.length === 0;
  const telefonoInvalido =
    candidatoTelefono.trim() !== "" && !TELEFONO_REGEX.test(candidatoTelefono.trim());
  const errorTelefono = telefonoInvalido ? MENSAJE_TELEFONO : mensajes.telefono;

  // Cada campo borra su mensaje de error al volver a escribir en él.
  const alCambiar = (setter) => (e) => {
    setter(e.target.value);
    limpiar(e.target.name);
  };
  const claseCampo = (campo, base = "form-control") => `${base}${mensajes[campo] ? " is-invalid" : ""}`;
  const retroalimentacion = (campo) => mensajes[campo] && <div className="invalid-feedback">{mensajes[campo]}</div>;

  return (
    <div>
      <h2 className="h4 mb-3">{esEdicion ? "Editar solicitud" : "Nueva solicitud"}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-12">
            <label htmlFor="solicitud-nombre" className="form-label">
              Nombre del candidato
            </label>
            <input
              id="solicitud-nombre"
              name="nombre"
              type="text"
              value={candidatoNombre}
              onChange={alCambiar(setCandidatoNombre)}
              required
              className={claseCampo("nombre")}
            />
            {retroalimentacion("nombre")}
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="solicitud-correo" className="form-label">
              Correo del candidato
            </label>
            <input
              id="solicitud-correo"
              name="correo"
              type="email"
              value={candidatoCorreo}
              onChange={alCambiar(setCandidatoCorreo)}
              required
              className={claseCampo("correo")}
            />
            {retroalimentacion("correo")}
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="solicitud-telefono" className="form-label">
              Teléfono del candidato
            </label>
            <input
              id="solicitud-telefono"
              name="telefono"
              type="tel"
              value={candidatoTelefono}
              onChange={alCambiar(setCandidatoTelefono)}
              required
              placeholder="+56 9 1234 5678"
              aria-invalid={Boolean(errorTelefono)}
              className={`form-control${errorTelefono ? " is-invalid" : ""}`}
            />
            {errorTelefono && <div className="invalid-feedback">{errorTelefono}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="solicitud-familia" className="form-label">
              Familia de cargo
            </label>
            <select
              id="solicitud-familia"
              name="familia"
              value={familiaDeCargo}
              onChange={alCambiar(setFamiliaDeCargo)}
              required
              className={claseCampo("familia", "form-select")}
            >
              {familias.map((familia) => (
                <option key={familia._id} value={familia._id}>
                  {familia.nombre}
                </option>
              ))}
            </select>
            {retroalimentacion("familia")}
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="solicitud-cargo" className="form-label">
              Cargo
            </label>
            <input
              id="solicitud-cargo"
              name="cargo"
              type="text"
              value={cargo}
              onChange={alCambiar(setCargo)}
              required
              className={claseCampo("cargo")}
            />
            {retroalimentacion("cargo")}
          </div>

          <div className="col-12">
            <label htmlFor="solicitud-responsable" className="form-label">
              Profesional responsable (evaluador)
            </label>
            <select
              id="solicitud-responsable"
              name="responsable"
              value={profesionalResponsable}
              onChange={alCambiar(setProfesionalResponsable)}
              required
              className={claseCampo("responsable", "form-select")}
            >
              <option value="" disabled>
                Selecciona un evaluador
              </option>
              {evaluadores.map((evaluador) => (
                <option key={evaluador._id} value={evaluador._id}>
                  {evaluador.nombre}
                </option>
              ))}
            </select>
            {retroalimentacion("responsable")}
          </div>

          <div className="col-12">
            <label htmlFor="solicitud-observaciones" className="form-label">
              Observaciones
            </label>
            <textarea
              id="solicitud-observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="form-control"
            />
          </div>

          <div className="col-12">
            <CampoArchivo
              nombre="cv"
              etiqueta={esEdicion ? "Reemplazar CV (opcional)" : "CV del candidato (opcional)"}
              archivo={cv}
              onChange={setCv}
            />
          </div>
          {esEdicion && (
            <div className="col-12">
              <ArchivoDescargable
                etiqueta="CV actual"
                archivo={solicitud.candidato?.cvArchivoId}
                rutaAntigua={solicitud.candidato?.cvUrl || solicitud.cvUrl}
              />
            </div>
          )}

          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0" role="alert">
                {error}
              </div>
            </div>
          )}

          <div className="col-12 d-flex gap-2">
            <button
              type="submit"
              disabled={cargando || sinDatosBase || telefonoInvalido}
              className="btn btn-primary flex-fill"
            >
              {cargando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {cargando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear solicitud"}
            </button>
            {alCancelar && (
              <button type="button" onClick={alCancelar} disabled={cargando} className="btn btn-outline-secondary">
                Cancelar
              </button>
            )}
          </div>

          {familias.length === 0 && (
            <div className="col-12">
              <div className="alert alert-danger mb-0" role="alert">
                No hay familias de cargo cargadas. Ejecuta el seed del backend.
              </div>
            </div>
          )}
          {evaluadores.length === 0 && (
            <div className="col-12">
              <div className="alert alert-danger mb-0" role="alert">
                No hay usuarios con rol "evaluador" registrados todavía. Registra uno primero.
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
