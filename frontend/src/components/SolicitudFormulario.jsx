import { useEffect, useId, useState } from "react";

import { listarFamilias } from "../services/familiaService";
import { listarUsuarios } from "../services/usuarioService";
import {
  crearSolicitud,
  actualizarSolicitud,
} from "../services/solicitudService";

import { useValidacionFormulario } from "../hooks/useValidacionFormulario";
import { CARGOS_POR_FAMILIA } from "../config/catalogoCargos";

import { aValorDatetimeLocal, desdeValorDatetimeLocal } from "../utils/fechas";

import CampoArchivo from "./CampoArchivo";
import ArchivoDescargable from "./ArchivoDescargable";

const TELEFONO_REGEX = /^\+?56\s?9\s?\d{4}\s?\d{4}$/;

const MENSAJE_FECHA = "Ingresa una fecha y hora de evaluación válidas";

const MENSAJE_TELEFONO =
  "Ingresa un celular chileno válido: +56 9 1234 5678";

export default function SolicitudFormulario({
  solicitud,
  alGuardar,
  alCancelar,
}) {
  const esEdicion = Boolean(solicitud);

  const prefijo = useId();

  const [familias, setFamilias] = useState([]);
  const [evaluadores, setEvaluadores] = useState([]);

  const [candidatoNombre, setCandidatoNombre] = useState(
    solicitud?.candidato?.nombre || ""
  );

  const [candidatoCorreo, setCandidatoCorreo] = useState(
    solicitud?.candidato?.correo || ""
  );

  const [candidatoTelefono, setCandidatoTelefono] = useState(
    solicitud?.candidato?.telefono || ""
  );

  const [familiaDeCargo, setFamiliaDeCargo] = useState(
    solicitud?.familiaDeCargo?._id || ""
  );

  const [cargo, setCargo] = useState(solicitud?.cargo || "");

  const [observaciones, setObservaciones] = useState(
    solicitud?.observaciones || ""
  );

  const [profesionalResponsable, setProfesionalResponsable] = useState(
    solicitud?.profesionalResponsable?._id || ""
  );

  // Fecha y hora de evaluación (opcional), en el formato del input datetime-local.
  const [fechaEvaluacion, setFechaEvaluacion] = useState(
    aValorDatetimeLocal(solicitud?.fechaEvaluacion)
  );
  const [errorFecha, setErrorFecha] = useState("");

  const [cv, setCv] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const { mensajes, validar, limpiar } = useValidacionFormulario();

  const familiaSeleccionada = familias.find(
    (familia) => familia._id === familiaDeCargo
  );

  const cargosDisponibles = familiaSeleccionada
    ? CARGOS_POR_FAMILIA[familiaSeleccionada.nombre] || []
    : [];

  const cargoExisteEnCatalogo = cargosDisponibles.some(
    (item) => item.nombre === cargo
  );

  useEffect(() => {
    Promise.all([
      listarFamilias(),
      listarUsuarios("evaluador"),
    ])
      .then(([familiasData, evaluadoresData]) => {
        setFamilias(familiasData);
        setEvaluadores(evaluadoresData);

        if (!esEdicion && familiasData.length > 0) {
          setFamiliaDeCargo(familiasData[0]._id);
        }

        if (!esEdicion && evaluadoresData.length > 0) {
          setProfesionalResponsable(evaluadoresData[0]._id);
        }
      })
      .catch(() =>
        setError(
          "No se pudieron cargar las familias de cargo o los evaluadores"
        )
      )
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

    // Conserva el instante original si no cambió el input: evita perder segundos y
    // cambiar de ocurrencia cuando el horario de invierno repite una hora local.
    const fechaIso = esEdicion && fechaEvaluacion === aValorDatetimeLocal(solicitud.fechaEvaluacion)
      ? solicitud.fechaEvaluacion || ""
      : desdeValorDatetimeLocal(fechaEvaluacion);

    if (fechaIso === null) {
      setErrorFecha(MENSAJE_FECHA);
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
        fechaEvaluacion: fechaIso,
        cv,
      };

      const resultado = esEdicion
        ? await actualizarSolicitud(solicitud._id, datos)
        : await crearSolicitud(datos);

      alGuardar(resultado);
    } catch (err) {
      setError(
        err.response?.data?.mensaje ||
          "Error al guardar la solicitud"
      );
    } finally {
      setCargando(false);
    }
  }

  if (cargandoDatos) {
    return (
      <div
        className="d-flex align-items-center gap-2 text-secondary"
        role="status"
      >
        <div
          className="spinner-border spinner-border-sm"
          aria-hidden="true"
        />

        <span>Cargando datos del formulario...</span>
      </div>
    );
  }

  const sinDatosBase =
    familias.length === 0 || evaluadores.length === 0;

  const telefonoInvalido =
    candidatoTelefono.trim() !== "" &&
    !TELEFONO_REGEX.test(candidatoTelefono.trim());

  const errorTelefono = telefonoInvalido
    ? MENSAJE_TELEFONO
    : mensajes.telefono;

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
        id={`${prefijo}-solicitud-${campo}-error`}
        className="invalid-feedback"
      >
        {mensajes[campo]}
      </div>
    );

  return (
    <div>
      <h2 className="h4 mb-3">
        {esEdicion ? "Editar solicitud" : "Nueva solicitud"}
      </h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-12">
            <label
              htmlFor={`${prefijo}-solicitud-nombre`}
              className="form-label"
            >
              Nombre del candidato
            </label>

            <input
              id={`${prefijo}-solicitud-nombre`}
              name="nombre"
              type="text"
              value={candidatoNombre}
              onChange={alCambiar(setCandidatoNombre)}
              required
              aria-invalid={Boolean(mensajes.nombre)}
              aria-describedby={
                mensajes.nombre
                  ? `${prefijo}-solicitud-nombre-error`
                  : undefined
              }
              className={claseCampo("nombre")}
            />

            {retroalimentacion("nombre")}
          </div>

          <div className="col-12 col-md-6">
            <label
              htmlFor={`${prefijo}-solicitud-correo`}
              className="form-label"
            >
              Correo del candidato
            </label>

            <input
              id={`${prefijo}-solicitud-correo`}
              name="correo"
              type="email"
              value={candidatoCorreo}
              onChange={alCambiar(setCandidatoCorreo)}
              required
              aria-invalid={Boolean(mensajes.correo)}
              aria-describedby={
                mensajes.correo
                  ? `${prefijo}-solicitud-correo-error`
                  : undefined
              }
              className={claseCampo("correo")}
            />

            {retroalimentacion("correo")}
          </div>

          <div className="col-12 col-md-6">
            <label
              htmlFor={`${prefijo}-solicitud-telefono`}
              className="form-label"
            >
              Teléfono del candidato
            </label>

            <input
              id={`${prefijo}-solicitud-telefono`}
              name="telefono"
              type="tel"
              value={candidatoTelefono}
              onChange={alCambiar(setCandidatoTelefono)}
              required
              placeholder="+56 9 1234 5678"
              aria-invalid={Boolean(errorTelefono)}
              aria-describedby={
                errorTelefono
                  ? `${prefijo}-solicitud-telefono-error`
                  : undefined
              }
              className={`form-control${
                errorTelefono ? " is-invalid" : ""
              }`}
            />

            {errorTelefono && (
              <div
                id={`${prefijo}-solicitud-telefono-error`}
                className="invalid-feedback"
              >
                {errorTelefono}
              </div>
            )}
          </div>

          <div className="col-12 col-md-6">
            <label
              htmlFor={`${prefijo}-solicitud-familia`}
              className="form-label"
            >
              Familia de cargo
            </label>

            <select
              id={`${prefijo}-solicitud-familia`}
              name="familia"
              value={familiaDeCargo}
              onChange={(e) => {
                setFamiliaDeCargo(e.target.value);
                setCargo("");
                limpiar("familia");
                limpiar("cargo");
              }}
              required
              aria-invalid={Boolean(mensajes.familia)}
              aria-describedby={
                mensajes.familia
                  ? `${prefijo}-solicitud-familia-error`
                  : undefined
              }
              className={claseCampo(
                "familia",
                "form-select"
              )}
            >
              {familias.map((familia) => (
                <option
                  key={familia._id}
                  value={familia._id}
                >
                  {familia.nombre}
                </option>
              ))}
            </select>

            {retroalimentacion("familia")}
          </div>

          <div className="col-12 col-md-6">
            <label
              htmlFor={`${prefijo}-solicitud-cargo`}
              className="form-label"
            >
              Cargo
            </label>

            <select
              id={`${prefijo}-solicitud-cargo`}
              name="cargo"
              value={cargo}
              onChange={alCambiar(setCargo)}
              required
              disabled={!familiaDeCargo}
              aria-invalid={Boolean(mensajes.cargo)}
              aria-describedby={
                mensajes.cargo
                  ? `${prefijo}-solicitud-cargo-error`
                  : undefined
              }
              className={claseCampo(
                "cargo",
                "form-select"
              )}
            >
              <option value="" disabled>
                {familiaDeCargo
                  ? "Selecciona un cargo"
                  : "Selecciona primero una familia"}
              </option>

              {esEdicion &&
                cargo &&
                !cargoExisteEnCatalogo && (
                  <option value={cargo}>
                    {cargo} (cargo registrado)
                  </option>
                )}

              {cargosDisponibles.map((item) => (
                <option
                  key={item.nombre}
                  value={item.nombre}
                >
                  {item.nombre}
                </option>
              ))}
            </select>

            {retroalimentacion("cargo")}
          </div>

          <div className="col-12">
            <label
              htmlFor={`${prefijo}-solicitud-responsable`}
              className="form-label"
            >
              Profesional responsable (evaluador)
            </label>

            <select
              id={`${prefijo}-solicitud-responsable`}
              name="responsable"
              value={profesionalResponsable}
              onChange={alCambiar(
                setProfesionalResponsable
              )}
              required
              aria-invalid={Boolean(mensajes.responsable)}
              aria-describedby={
                mensajes.responsable
                  ? `${prefijo}-solicitud-responsable-error`
                  : undefined
              }
              className={claseCampo(
                "responsable",
                "form-select"
              )}
            >
              <option value="" disabled>
                Selecciona un evaluador
              </option>

              {evaluadores.map((evaluador) => (
                <option
                  key={evaluador._id}
                  value={evaluador._id}
                >
                  {evaluador.nombre}
                </option>
              ))}
            </select>

            {retroalimentacion("responsable")}
          </div>

          <div className="col-12 col-md-6">
            <label
              htmlFor={`${prefijo}-solicitud-fecha`}
              className="form-label"
            >
              Fecha y hora de evaluación (opcional)
            </label>

            <input
              id={`${prefijo}-solicitud-fecha`}
              name="fechaEvaluacion"
              type="datetime-local"
              value={fechaEvaluacion}
              onChange={(e) => {
                setFechaEvaluacion(e.target.value);
                setErrorFecha("");
              }}
              aria-invalid={Boolean(errorFecha)}
              aria-describedby={
                errorFecha
                  ? `${prefijo}-solicitud-fecha-error`
                  : `${prefijo}-solicitud-fecha-ayuda`
              }
              className={`form-control${errorFecha ? " is-invalid" : ""}`}
            />

            {errorFecha && (
              <div
                id={`${prefijo}-solicitud-fecha-error`}
                className="invalid-feedback"
              >
                {errorFecha}
              </div>
            )}

            <div
              id={`${prefijo}-solicitud-fecha-ayuda`}
              className="form-text"
            >
              Hora local. Puedes dejarla vacía y definirla después.
            </div>
          </div>

          <div className="col-12">
            <label
              htmlFor={`${prefijo}-solicitud-observaciones`}
              className="form-label"
            >
              Observaciones
            </label>

            <textarea
              id={`${prefijo}-solicitud-observaciones`}
              value={observaciones}
              onChange={(e) =>
                setObservaciones(e.target.value)
              }
              rows={3}
              className="form-control"
            />
          </div>

          <div className="col-12">
            <CampoArchivo
              nombre="cv"
              etiqueta={
                esEdicion
                  ? "Reemplazar CV (opcional)"
                  : "CV del candidato (opcional)"
              }
              archivo={cv}
              onChange={setCv}
            />
          </div>

          {esEdicion && (
            <div className="col-12">
              <ArchivoDescargable
                etiqueta="CV actual"
                archivo={
                  solicitud.candidato?.cvArchivoId
                }
                rutaAntigua={
                  solicitud.candidato?.cvUrl ||
                  solicitud.cvUrl
                }
              />
            </div>
          )}

          {error && (
            <div className="col-12">
              <div
                className="alert alert-danger mb-0"
                role="alert"
              >
                {error}
              </div>
            </div>
          )}

          <div className="col-12 d-flex gap-2">
            <button
              type="submit"
              disabled={
                cargando ||
                sinDatosBase ||
                telefonoInvalido
              }
              className="btn btn-primary flex-fill"
            >
              {cargando && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                />
              )}

              {cargando
                ? "Guardando..."
                : esEdicion
                ? "Guardar cambios"
                : "Crear solicitud"}
            </button>

            {alCancelar && (
              <button
                type="button"
                onClick={alCancelar}
                disabled={cargando}
                className="btn btn-outline-secondary"
              >
                Cancelar
              </button>
            )}
          </div>

          {familias.length === 0 && (
            <div className="col-12">
              <div
                className="alert alert-danger mb-0"
                role="alert"
              >
                No hay familias de cargo cargadas. Ejecuta el
                seed del backend.
              </div>
            </div>
          )}

          {evaluadores.length === 0 && (
            <div className="col-12">
              <div
                className="alert alert-danger mb-0"
                role="alert"
              >
                No hay usuarios con rol "evaluador"
                registrados todavía. Registra uno primero.
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
