import { useEffect, useId, useRef, useState } from "react";
import { obtenerInforme, generarInforme, guardarInforme } from "../services/informeService";
import { mensajeErrorIa } from "../utils/mensajeErrorIa";
import EvaluacionIa from "./EvaluacionIa";

function AvisoIa({ guardado = false }) {
  return (
    <div className="alert alert-warning mb-0" role="note">
      <p className="fw-semibold mb-1">{guardado ? "Revisión y responsabilidad profesional" : "⚠️ Borrador generado por inteligencia artificial"}</p>
      <p className="small mb-0">
        {guardado ? "Guardar registra el contenido en el sistema. La revisión y validación del informe son responsabilidad del profesional evaluador." : <>Este texto es una <strong>propuesta inicial</strong> y puede contener errores, omisiones o
        interpretaciones incorrectas de los apuntes. <strong>Debe ser revisado, corregido y validado
        por el profesional evaluador</strong> antes de usarse o compartirse. Un informe psicolaboral
        incide en la decisión de contratación de una persona: la responsabilidad del contenido final
        es siempre del profesional, no del sistema.</>}
      </p>
    </div>
  );
}

// puedeEditar lo calcula el detalle con la misma regla del backend: admin, o el evaluador
// responsable de la solicitud. tieneCv y tieneInforme habilitan la evaluación con nota.
export default function InformePsicolaboral(props) {
  return <InformePorSolicitud key={props.solicitudId} {...props} />;
}

function InformePorSolicitud({ solicitudId, puedeEditar, estadoSolicitud, tieneCv, tieneInforme, iaPendienteDeContinuidad }) {
  const prefijoId = useId();

  const [informe, setInforme] = useState(null);
  const [apuntes, setApuntes] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [secciones, setSecciones] = useState([]);
  const [modeloIa, setModeloIa] = useState("");

  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState(false);
  const [hayCambios, setHayCambios] = useState(false);
  const enCurso = useRef(false);
  const finalizada = estadoSolicitud === "Finalizada";
  const mostrarEditor = puedeEditar && !finalizada && !errorCarga && (!informe || editando);

  function cargarCampos(data) {
    setSecciones(data?.secciones ?? []);
    setApuntes(data?.apuntes ?? "");
    setInstrucciones(data?.instrucciones ?? "");
    setModeloIa(data?.modeloIa ?? "");
    setHayCambios(false);
  }

  useEffect(() => {
    let vigente = true;
    obtenerInforme(solicitudId)
      .then((data) => {
        if (!vigente) return;
        if (data !== null && !Array.isArray(data?.secciones)) throw new Error("Respuesta inválida");
        setInforme(data);
        cargarCampos(data);
      })
      .catch((err) => {
        if (vigente) setErrorCarga(err.response?.data?.mensaje || "No se pudo cargar el informe psicolaboral.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [solicitudId]);

  useEffect(() => {
    if (!mostrarEditor || !hayCambios) return;
    const advertir = (evento) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", advertir);
    return () => window.removeEventListener("beforeunload", advertir);
  }, [mostrarEditor, hayCambios]);

  function cambiarModo(editar) {
    cargarCampos(informe);
    setError("");
    setAviso("");
    setEditando(editar);
  }

  async function handleGenerar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setError("");
    setAviso("");
    setGenerando(true);
    try {
      // Los apuntes viven en el estado del componente: aunque la generacion
      // falle, el evaluador no pierde lo que escribio.
      const borrador = await generarInforme(solicitudId, apuntes, instrucciones);
      if (!Array.isArray(borrador?.secciones)) throw new Error("Respuesta inválida");
      setSecciones(borrador.secciones);
      setModeloIa(borrador.modeloIa || "");
      setHayCambios(true);
      setAviso("Borrador generado. Revísalo y corrígelo antes de guardar.");
    } catch (err) {
      setError(mensajeErrorIa(err, "No se pudo generar el borrador. Intenta nuevamente."));
    } finally {
      enCurso.current = false;
      setGenerando(false);
    }
  }

  async function handleGuardar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setError("");
    setAviso("");
    setGuardando(true);
    try {
      const guardado = await guardarInforme(solicitudId, {
        secciones,
        apuntes,
        instrucciones,
        modeloIa,
        estado: informe?.estado === "finalizado" ? "finalizado" : "borrador",
      });
      if (!Array.isArray(guardado?.secciones)) throw new Error("Respuesta inválida");
      setInforme(guardado);
      cargarCampos(guardado);
      setEditando(false);
      setAviso("Informe guardado.");
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo guardar el informe.");
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  function cambiarSeccion(indice, contenido) {
    setHayCambios(true);
    setSecciones((prev) => prev.map((s, i) => (i === indice ? { ...s, contenido } : s)));
  }

  if (cargando) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Cargando informe...</span>
      </div>
    );
  }

  const hayContenido = secciones.length > 0;
  const estadoInforme = errorCarga ? (
    <p className="alert alert-danger mb-0" role="alert">{errorCarga}</p>
  ) : !informe && (
    <div className="text-secondary">
      <p className="mb-0">Todavía no hay un informe psicolaboral guardado en el sistema.</p>
      {tieneInforme && <p className="mb-0 mt-1">El informe de entrevista Word está disponible en el expediente del postulante.</p>}
      {!finalizada && !puedeEditar && !iaPendienteDeContinuidad && <p className="mb-0 mt-1">Solo el evaluador responsable puede generarlo.</p>}
    </div>
  );

  // Tarjeta de la evaluación con nota: misma sección y mismos permisos que el informe.
  const tarjetaEvaluacion = (
    <EvaluacionIa
      solicitudId={solicitudId}
      puedeEditar={puedeEditar}
      estadoSolicitud={estadoSolicitud}
      apuntes={apuntes}
      tieneCv={tieneCv}
      tieneInforme={tieneInforme}
    />
  );

  const ocupado = generando || guardando;
  const fechaEdicion = informe?.updatedAt || informe?.generadoEn || informe?.createdAt;

  return (
    <div className="d-flex flex-column gap-4">
      {estadoInforme}
      {aviso && <div className="alert alert-success mb-0" role="status">{aviso}</div>}
      {informe && !mostrarEditor && (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span className="badge text-bg-success">Guardado</span>
            {puedeEditar && !finalizada && (
              <button type="button" className="btn btn-outline-primary" onClick={() => cambiarModo(true)}>
                Editar informe
              </button>
            )}
          </div>
          {informe.secciones.map(({ titulo, contenido }, indice) => (
            <div key={indice}>
              <h4 className="h6 fw-semibold">{titulo}</h4>
              <p className="mb-0 text-break" style={{ whiteSpace: "pre-wrap" }}>{contenido}</p>
            </div>
          ))}
          {informe.apuntes && (
            <div>
              <h4 className="h6 fw-semibold">Observaciones de la entrevista</h4>
              <p className="mb-0 text-break" style={{ whiteSpace: "pre-wrap" }}>{informe.apuntes}</p>
            </div>
          )}
          {(informe.generadoPor?.nombre || fechaEdicion || informe.modeloIa) && (
            <div className="border-top pt-3 small text-secondary">
              <h4 className="h6 fw-semibold">Información del informe</h4>
              {informe.generadoPor?.nombre && <p className="mb-1">Última edición: {informe.generadoPor.nombre}</p>}
              {fechaEdicion && <p className="mb-1">Fecha: {new Date(fechaEdicion).toLocaleString()}</p>}
              {informe.modeloIa && <p className="mb-0">Modelo de IA: {informe.modeloIa}</p>}
            </div>
          )}
          <AvisoIa guardado />
        </div>
      )}
      {mostrarEditor && (
        <fieldset disabled={ocupado} className="d-flex flex-column gap-4">
          {!informe && hayContenido && <span className="badge text-bg-warning align-self-start">Borrador sin guardar</span>}
          <AvisoIa />

          <div>
            <label htmlFor={`${prefijoId}-apuntes`} className="form-label">
              Apuntes de la entrevista
            </label>
            <textarea
              id={`${prefijoId}-apuntes`}
              aria-describedby={`${prefijoId}-apuntes-ayuda`}
              value={apuntes}
              onChange={(e) => { setApuntes(e.target.value); setHayCambios(true); }}
              rows={7}
              placeholder="Ej.: Candidata con 4 años de experiencia en atención de público. Relata manejo de reclamos..."
              className="form-control"
            />
            <div id={`${prefijoId}-apuntes-ayuda`} className="form-text">
              Escribe o pega aquí tus observaciones. La IA redactará el borrador únicamente a partir de este texto.
            </div>
          </div>

          <div>
            <label htmlFor={`${prefijoId}-instrucciones`} className="form-label">
              Instrucciones adicionales para la IA <span className="text-secondary">(opcional)</span>
            </label>
            <textarea
              id={`${prefijoId}-instrucciones`}
              aria-describedby={`${prefijoId}-instrucciones-ayuda`}
              value={instrucciones}
              onChange={(e) => { setInstrucciones(e.target.value); setHayCambios(true); }}
              rows={3}
              placeholder="Ej.: hazlo más breve y profundiza en las áreas de mejora."
              className="form-control"
            />
            <div id={`${prefijoId}-instrucciones-ayuda`} className="form-text">
              Indica cómo quieres el borrador. Por ejemplo: "enfócate en el trabajo en equipo", "hazlo más
              breve", "usa un tono más formal", "profundiza en las áreas de mejora". Solo ajustan el estilo y
              el énfasis: no cambian las reglas del informe.
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerar}
              disabled={ocupado || !apuntes.trim()}
              className="btn btn-primary"
            >
              {generando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {generando
                ? "Generando borrador..."
                : hayContenido
                  ? "Volver a generar con IA"
                  : "Generar borrador con IA"}
            </button>
            {hayContenido && (
              <button
                type="button"
                onClick={handleGuardar}
                disabled={guardando || generando}
                className="btn btn-success"
              >
                {guardando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                {guardando ? "Guardando..." : informe ? "Guardar cambios" : "Guardar informe"}
              </button>
            )}
            {informe && (
              <button type="button" className="btn btn-outline-secondary" onClick={() => cambiarModo(false)}>
                Cancelar edición
              </button>
            )}
          </div>

          {generando && (
            <div className="d-flex align-items-center gap-2 text-secondary" role="status">
              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
              <span>Redactando el borrador, esto puede tardar unos segundos. Tus apuntes no se pierden.</span>
            </div>
          )}
          {error && (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          )}

          {hayContenido && (
            <div className="d-flex flex-column gap-3 border-top pt-3">
              {secciones.map((seccion, indice) => (
                <div key={seccion.titulo}>
                  <label htmlFor={`${prefijoId}-seccion-${indice}`} className="form-label fw-semibold">
                    {seccion.titulo}
                  </label>
                  <textarea
                    id={`${prefijoId}-seccion-${indice}`}
                    value={seccion.contenido}
                    onChange={(e) => cambiarSeccion(indice, e.target.value)}
                    rows={5}
                    className="form-control"
                  />
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {tarjetaEvaluacion}
    </div>
  );
}
