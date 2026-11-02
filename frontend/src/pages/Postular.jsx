import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import CampoArchivo from "../components/CampoArchivo";
import { useValidacionFormulario } from "../hooks/useValidacionFormulario";
import { listarFamiliasPublicas, enviarPostulacion } from "../services/postulacionService";
import { CARGOS_POR_FAMILIA } from "../config/catalogoCargos";
import { MAX_MENSAJE_ADICIONAL } from "../config/solicitud";

const TELEFONO_REGEX = /^\+?56\s?9\s?\d{4}\s?\d{4}$/;
const MENSAJE_TELEFONO = "Ingresa un celular chileno válido: +56 9 1234 5678";
const MENSAJE_MENSAJE_LARGO = `El mensaje adicional no puede superar los ${MAX_MENSAJE_ADICIONAL} caracteres.`;
const EXTENSIONES_CV = [".pdf", ".doc", ".docx"];
const TAMANO_MAXIMO_CV = 5 * 1024 * 1024;

function validarArchivoCv(archivo) {
  if (!archivo) return "Adjunta tu CV en formato PDF, DOC o DOCX";

  const nombre = archivo.name.toLowerCase();

  if (!EXTENSIONES_CV.some((extension) => nombre.endsWith(extension))) {
    return "Formato de CV no permitido. Usa PDF, DOC o DOCX.";
  }

  if (archivo.size > TAMANO_MAXIMO_CV) {
    return "El CV supera el tamaño máximo de 5 MB.";
  }

  return "";
}

// Página pública (sin login) para que un candidato, interno o externo, envíe su postulación.
export default function Postular() {
  const prefijo = useId();

  const [familias, setFamilias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [familiaDeCargo, setFamiliaDeCargo] = useState("");
  const [cargo, setCargo] = useState("");
  const [mensajeAdicional, setMensajeAdicional] = useState("");
  const [errorMensaje, setErrorMensaje] = useState("");
  const [cv, setCv] = useState(null);
  const [sitioWeb, setSitioWeb] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargandoFamilias, setCargandoFamilias] = useState(true);
  const [enviada, setEnviada] = useState(false);

  const { mensajes, validar, limpiar } = useValidacionFormulario();

  const familiaSeleccionada = familias.find(
    (familia) => familia._id === familiaDeCargo
  );

  const cargosDisponibles = familiaSeleccionada
    ? CARGOS_POR_FAMILIA[familiaSeleccionada.nombre] || []
    : [];

  const cargoSeleccionado = cargosDisponibles.find(
    (item) => item.nombre === cargo
  );

  useEffect(() => {
    listarFamiliasPublicas()
      .then(setFamilias)
      .catch(() =>
        setError("No pudimos cargar los cargos disponibles. Recarga la página.")
      )
      .finally(() => setCargandoFamilias(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!validar(e.currentTarget)) return;

    if (mensajeAdicional.trim().length > MAX_MENSAJE_ADICIONAL) {
      setErrorMensaje(MENSAJE_MENSAJE_LARGO);
      return;
    }

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
      await enviarPostulacion({
        nombre,
        correo,
        telefono,
        familiaDeCargo,
        cargo,
        mensajeAdicional: mensajeAdicional.trim(),
        cv,
        sitioWeb,
      });

      setEnviada(true);
    } catch (err) {
      setError(
        err.response?.data?.mensaje ||
          "No pudimos enviar tu postulación. Inténtalo más tarde."
      );
    } finally {
      setEnviando(false);
    }
  }

  // Cada campo borra su mensaje de error al volver a escribir en él.
  const alCambiar = (setter) => (e) => {
    setter(e.target.value);
    limpiar(e.target.name);
  };

  const claseCampo = (campo, base = "form-control") =>
    `${base}${mensajes[campo] ? " is-invalid" : ""}`;

  const retroalimentacion = (campo) =>
    mensajes[campo] && (
      <div
        id={`${prefijo}-postular-${campo}-error`}
        className="invalid-feedback"
      >
        {mensajes[campo]}
      </div>
    );

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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </div>

              <h2 className="h4 mb-3">Postulación recibida</h2>

              <div className="alert alert-success mb-0" role="status">
                Gracias, {nombre.trim().split(" ")[0]}. Recibimos tus datos y
                tu CV. El equipo de selección revisará tu postulación y te
                contactará al correo o teléfono que indicaste.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const telefonoInvalido =
    telefono.trim() !== "" && !TELEFONO_REGEX.test(telefono.trim());

  const errorTelefono = telefonoInvalido
    ? MENSAJE_TELEFONO
    : mensajes.telefono;

  const errorArchivo = (cv ? validarArchivoCv(cv) : "") || mensajes.cv;

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-9 col-lg-7 col-xl-6">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4">Postula a un cargo</h1>

            <p className="text-body-secondary mb-4">
              Completa tus datos, selecciona un área y un cargo disponible, y
              adjunta tu CV. No necesitas crear una cuenta.
            </p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="position-relative"
            >
              <div className="row g-3">
                <div className="col-12">
                  <label
                    htmlFor={`${prefijo}-postular-nombre`}
                    className="form-label"
                  >
                    Nombre completo
                  </label>

                  <input
                    id={`${prefijo}-postular-nombre`}
                    name="nombre"
                    type="text"
                    value={nombre}
                    onChange={alCambiar(setNombre)}
                    required
                    minLength={3}
                    maxLength={100}
                    autoComplete="name"
                    aria-invalid={Boolean(mensajes.nombre)}
                    aria-describedby={
                      mensajes.nombre
                        ? `${prefijo}-postular-nombre-error`
                        : undefined
                    }
                    className={claseCampo("nombre")}
                  />

                  {retroalimentacion("nombre")}
                </div>

                <div className="col-12 col-md-6">
                  <label
                    htmlFor={`${prefijo}-postular-correo`}
                    className="form-label"
                  >
                    Correo
                  </label>

                  <input
                    id={`${prefijo}-postular-correo`}
                    name="correo"
                    type="email"
                    value={correo}
                    onChange={alCambiar(setCorreo)}
                    required
                    maxLength={254}
                    placeholder="nombre@ejemplo.cl"
                    autoComplete="email"
                    aria-invalid={Boolean(mensajes.correo)}
                    aria-describedby={
                      mensajes.correo
                        ? `${prefijo}-postular-correo-error`
                        : undefined
                    }
                    className={claseCampo("correo")}
                  />

                  {retroalimentacion("correo")}
                </div>

                <div className="col-12 col-md-6">
                  <label
                    htmlFor={`${prefijo}-postular-telefono`}
                    className="form-label"
                  >
                    Teléfono
                  </label>

                  <input
                    id={`${prefijo}-postular-telefono`}
                    name="telefono"
                    type="tel"
                    value={telefono}
                    onChange={alCambiar(setTelefono)}
                    required
                    placeholder="+56 9 1234 5678"
                    autoComplete="tel"
                    aria-invalid={Boolean(errorTelefono)}
                    aria-describedby={
                      errorTelefono
                        ? `${prefijo}-postular-telefono-error`
                        : undefined
                    }
                    className={`form-control${
                      errorTelefono ? " is-invalid" : ""
                    }`}
                  />

                  {errorTelefono && (
                    <div
                      id={`${prefijo}-postular-telefono-error`}
                      className="invalid-feedback"
                    >
                      {errorTelefono}
                    </div>
                  )}
                </div>

                <div className="col-12">
                  <label
                    htmlFor={`${prefijo}-postular-area`}
                    className="form-label"
                  >
                    Área de interés
                  </label>

                  <select
                    id={`${prefijo}-postular-area`}
                    name="area"
                    value={familiaDeCargo}
                    onChange={(e) => {
                      setFamiliaDeCargo(e.target.value);
                      setCargo("");
                      limpiar("area");
                      limpiar("cargo");
                    }}
                    required
                    disabled={cargandoFamilias}
                    aria-invalid={Boolean(mensajes.area)}
                    aria-describedby={
                      mensajes.area
                        ? `${prefijo}-postular-area-error`
                        : undefined
                    }
                    className={claseCampo("area", "form-select")}
                  >
                    <option value="" disabled>
                      {cargandoFamilias
                        ? "Cargando..."
                        : "Selecciona un área"}
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
                  <label
                    htmlFor={`${prefijo}-postular-cargo`}
                    className="form-label"
                  >
                    Cargo al que postulas
                  </label>

                  <select
                    id={`${prefijo}-postular-cargo`}
                    name="cargo"
                    value={cargo}
                    onChange={alCambiar(setCargo)}
                    required
                    disabled={!familiaDeCargo}
                    aria-invalid={Boolean(mensajes.cargo)}
                    aria-describedby={
                      mensajes.cargo
                        ? `${prefijo}-postular-cargo-error`
                        : undefined
                    }
                    className={claseCampo("cargo", "form-select")}
                  >
                    <option value="" disabled>
                      {familiaDeCargo
                        ? "Selecciona un cargo"
                        : "Selecciona primero un área"}
                    </option>

                    {cargosDisponibles.map((item) => (
                      <option key={item.nombre} value={item.nombre}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>

                  {retroalimentacion("cargo")}

                  {cargoSeleccionado && (
                    <div className="card bg-body-tertiary mt-3">
                      <div className="card-body">
                        <h2 className="h6 mb-2">
                          {cargoSeleccionado.nombre}
                        </h2>

                        <p className="mb-2">
                          {cargoSeleccionado.descripcion}
                        </p>

                        <p className="fw-semibold mb-1">
                          Requisitos:
                        </p>

                        <ul className="mb-2">
                          {cargoSeleccionado.requisitos.map((requisito) => (
                            <li key={requisito}>{requisito}</li>
                          ))}
                        </ul>

                        <small className="text-body-secondary">
                          Información ficticia para demostración académica.
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-12">
                  <label
                    htmlFor={`${prefijo}-postular-mensaje`}
                    className="form-label"
                  >
                    Mensaje adicional (opcional)
                  </label>

                  <textarea
                    id={`${prefijo}-postular-mensaje`}
                    name="mensajeAdicional"
                    rows={4}
                    maxLength={MAX_MENSAJE_ADICIONAL}
                    value={mensajeAdicional}
                    onChange={(e) => {
                      setMensajeAdicional(e.target.value);
                      setErrorMensaje("");
                    }}
                    aria-invalid={Boolean(errorMensaje)}
                    aria-describedby={`${prefijo}-postular-mensaje-ayuda${
                      errorMensaje ? ` ${prefijo}-postular-mensaje-error` : ""
                    }`}
                    className={`form-control${errorMensaje ? " is-invalid" : ""}`}
                  />

                  {errorMensaje && (
                    <div
                      id={`${prefijo}-postular-mensaje-error`}
                      className="invalid-feedback"
                    >
                      {errorMensaje}
                    </div>
                  )}

                  <div
                    id={`${prefijo}-postular-mensaje-ayuda`}
                    className="form-text d-flex justify-content-between gap-2"
                  >
                    <span>
                      Cuéntanos brevemente por qué te interesa este cargo o agrega información que consideres relevante.
                    </span>
                    <span className="flex-shrink-0">
                      {mensajeAdicional.length}/{MAX_MENSAJE_ADICIONAL}
                    </span>
                  </div>
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
                    disabled={
                      enviando ||
                      cargandoFamilias ||
                      telefonoInvalido ||
                      Boolean(errorArchivo)
                    }
                    className="btn btn-primary"
                  >
                    {enviando && (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      />
                    )}

                    {enviando
                      ? "Enviando..."
                      : "Enviar postulación"}
                  </button>
                </div>
              </div>
            </form>

            <p className="mt-4 mb-0 small text-body-secondary">
              ¿Eres parte del equipo de selección?{" "}
              <Link to="/login">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}