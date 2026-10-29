import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CampoArchivo from "../components/CampoArchivo";
import { useValidacionFormulario } from "../hooks/useValidacionFormulario";
import { listarFamiliasPublicas, enviarPostulacion } from "../services/postulacionService";

const TELEFONO_REGEX = /^\+?56\s?9\s?\d{4}\s?\d{4}$/;
const MENSAJE_TELEFONO = "Ingresa un celular chileno válido: +56 9 1234 5678";
const EXTENSIONES_CV = [".pdf", ".doc", ".docx"];
const TAMANO_MAXIMO_CV = 5 * 1024 * 1024;

function validarArchivoCv(archivo) {
  if (!archivo) return "Adjunta tu CV en formato PDF, DOC o DOCX";
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES_CV.some((extension) => nombre.endsWith(extension))) {
    return "Formato de CV no permitido. Usa PDF, DOC o DOCX.";
  }
  if (archivo.size > TAMANO_MAXIMO_CV) return "El CV supera el tamaño máximo de 5 MB.";
  return "";
}

// Página pública (sin login) para que un candidato, interno o externo, envíe su postulación.
export default function Postular() {
  const [familias, setFamilias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [familiaDeCargo, setFamiliaDeCargo] = useState("");
  const [cargo, setCargo] = useState("");
  const [cv, setCv] = useState(null);
  const [sitioWeb, setSitioWeb] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargandoFamilias, setCargandoFamilias] = useState(true);
  const [enviada, setEnviada] = useState(false);
  const { mensajes, validar, limpiar } = useValidacionFormulario();

  useEffect(() => {
    listarFamiliasPublicas()
      .then(setFamilias)
      .catch(() => setError("No pudimos cargar los cargos disponibles. Recarga la página."))
      .finally(() => setCargandoFamilias(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!validar(e.currentTarget)) return;
    if (!TELEFONO_REGEX.test(telefono.trim())) {
      setError(MENSAJE_TELEFONO);
      return;
    }
    const errorCv = validarArchivoCv(cv);
    if (errorCv) {
      setError(errorCv);
      return;
    }

    setEnviando(true);
    try {
      await enviarPostulacion({ nombre, correo, telefono, familiaDeCargo, cargo, cv, sitioWeb });
      setEnviada(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No pudimos enviar tu postulación. Inténtalo más tarde.");
    } finally {
      setEnviando(false);
    }
  }

  // Cada campo borra su mensaje de error al volver a escribir en él.
  const alCambiar = (setter) => (e) => {
    setter(e.target.value);
    limpiar(e.target.name);
  };
  const claseCampo = (campo, base = "form-control") => `${base}${mensajes[campo] ? " is-invalid" : ""}`;
  const retroalimentacion = (campo) => mensajes[campo] && <div className="invalid-feedback">{mensajes[campo]}</div>;

  if (enviada) {
    return (
      <div className="row justify-content-center">
        <div className="col-12 col-md-9 col-lg-7 col-xl-6">
          <div className="card shadow-sm">
            <div className="card-body p-4 text-center">
              <div className="d-flex justify-content-center mb-3 text-success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  width="48"
                  height="48"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="h4 mb-3">Postulación recibida</h2>
              <div className="alert alert-success mb-0" role="alert">
                Gracias, {nombre.trim().split(" ")[0]}. Recibimos tus datos y tu CV. El equipo de selección revisará
                tu postulación y te contactará al correo o teléfono que indicaste.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const telefonoInvalido = telefono.trim() !== "" && !TELEFONO_REGEX.test(telefono.trim());
  const errorTelefono = telefonoInvalido ? MENSAJE_TELEFONO : mensajes.telefono;
  const errorArchivo = (cv ? validarArchivoCv(cv) : "") || mensajes.cv;

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-9 col-lg-7 col-xl-6">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4">Postula a un cargo</h1>
            <p className="text-body-secondary mb-4">
              Completa tus datos y adjunta tu CV. No necesitas crear una cuenta.
            </p>

            <form onSubmit={handleSubmit} noValidate className="position-relative">
              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="postular-nombre" className="form-label">
                    Nombre completo
                  </label>
                  <input
                    id="postular-nombre"
                    name="nombre"
                    type="text"
                    value={nombre}
                    onChange={alCambiar(setNombre)}
                    required
                    minLength={3}
                    maxLength={100}
                    autoComplete="name"
                    className={claseCampo("nombre")}
                  />
                  {retroalimentacion("nombre")}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="postular-correo" className="form-label">
                    Correo
                  </label>
                  <input
                    id="postular-correo"
                    name="correo"
                    type="email"
                    value={correo}
                    onChange={alCambiar(setCorreo)}
                    required
                    maxLength={254}
                    placeholder="nombre@ejemplo.cl"
                    autoComplete="email"
                    className={claseCampo("correo")}
                  />
                  {retroalimentacion("correo")}
                </div>
                <div className="col-12 col-md-6">
                  <label htmlFor="postular-telefono" className="form-label">
                    Teléfono
                  </label>
                  <input
                    id="postular-telefono"
                    name="telefono"
                    type="tel"
                    value={telefono}
                    onChange={alCambiar(setTelefono)}
                    required
                    placeholder="+56 9 1234 5678"
                    autoComplete="tel"
                    aria-invalid={Boolean(errorTelefono)}
                    className={`form-control${errorTelefono ? " is-invalid" : ""}`}
                  />
                  {errorTelefono && <div className="invalid-feedback">{errorTelefono}</div>}
                </div>

                <div className="col-12">
                  <label htmlFor="postular-area" className="form-label">
                    Área de interés
                  </label>
                  <select
                    id="postular-area"
                    name="area"
                    value={familiaDeCargo}
                    onChange={alCambiar(setFamiliaDeCargo)}
                    required
                    disabled={cargandoFamilias}
                    className={claseCampo("area", "form-select")}
                  >
                    <option value="" disabled>
                      {cargandoFamilias ? "Cargando..." : "Selecciona un área"}
                    </option>
                    {familias.map((familia) => (
                      <option key={familia._id} value={familia._id}>
                        {familia.nombre}
                      </option>
                    ))}
                  </select>
                  {retroalimentacion("area")}
                </div>

                <div className="col-12">
                  <label htmlFor="postular-cargo" className="form-label">
                    Cargo al que postulas
                  </label>
                  <input
                    id="postular-cargo"
                    name="cargo"
                    type="text"
                    value={cargo}
                    onChange={alCambiar(setCargo)}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Por ejemplo: Ejecutivo de ventas"
                    className={claseCampo("cargo")}
                  />
                  {retroalimentacion("cargo")}
                </div>

                <div className="col-12">
                  <CampoArchivo
                    nombre="cv"
                    etiqueta="CV"
                    archivo={cv}
                    onChange={(archivo) => {
                      setCv(archivo);
                      limpiar("cv");
                    }}
                    error={errorArchivo}
                    required
                  />
                </div>

                {/* Campo trampa para bots: oculto para las personas y fuera del orden de tabulación. */}
                <div
                  aria-hidden="true"
                  className="position-absolute overflow-hidden"
                  style={{ left: "-9999px", width: 1, height: 1 }}
                >
                  <label>
                    Sitio web
                    <input
                      type="text"
                      name="sitioWeb"
                      value={sitioWeb}
                      onChange={(e) => setSitioWeb(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>

                {error && (
                  <div className="col-12">
                    <div className="alert alert-danger mb-0" role="alert">
                      {error}
                    </div>
                  </div>
                )}

                <div className="col-12 d-grid">
                  <button
                    type="submit"
                    disabled={enviando || cargandoFamilias || telefonoInvalido || Boolean(errorArchivo)}
                    className="btn btn-primary"
                  >
                    {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                    {enviando ? "Enviando..." : "Enviar postulación"}
                  </button>
                </div>
              </div>
            </form>

            <p className="mt-4 mb-0 small text-body-secondary">
              ¿Eres parte del equipo de selección? <Link to="/login">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
