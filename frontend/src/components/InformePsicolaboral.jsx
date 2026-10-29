import { useEffect, useId, useState } from "react";
import { obtenerInforme, generarInforme, guardarInforme } from "../services/informeService";
import { mensajeErrorIa } from "../utils/mensajeErrorIa";
import EvaluacionIa from "./EvaluacionIa";

function AvisoIa() {
  return (
    <div className="alert alert-warning mb-0" role="note">
      <p className="fw-semibold mb-1">⚠️ Borrador generado por inteligencia artificial</p>
      <p className="small mb-0">
        Este texto es una <strong>propuesta inicial</strong> y puede contener errores, omisiones o
        interpretaciones incorrectas de los apuntes. <strong>Debe ser revisado, corregido y validado
        por el profesional evaluador</strong> antes de usarse o compartirse. Un informe psicolaboral
        incide en la decisión de contratación de una persona: la responsabilidad del contenido final
        es siempre del profesional, no del sistema.
      </p>
    </div>
  );
}

// puedeEditar lo calcula el detalle con la misma regla del backend: admin, o el evaluador
// responsable de la solicitud. tieneCv y tieneInforme habilitan la evaluación con nota.
export default function InformePsicolaboral({ solicitudId, puedeEditar, tieneCv, tieneInforme }) {
  const prefijoId = useId();

  const [informe, setInforme] = useState(null);
  const [apuntes, setApuntes] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [secciones, setSecciones] = useState([]);
  const [modeloIa, setModeloIa] = useState("");

  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    obtenerInforme(solicitudId)
      .then((data) => {
        if (data) {
          setInforme(data);
          setSecciones(data.secciones || []);
          setApuntes(data.apuntes || "");
          setInstrucciones(data.instrucciones || "");
          setModeloIa(data.modeloIa || "");
        }
      })
      .catch((err) => setError(err.response?.data?.mensaje || "Error al cargar el informe"))
      .finally(() => setCargando(false));
  }, [solicitudId]);

  async function handleGenerar() {
    setError("");
    setAviso("");
    setGenerando(true);
    try {
      // Los apuntes viven en el estado del componente: aunque la generacion
      // falle, el evaluador no pierde lo que escribio.
      const borrador = await generarInforme(solicitudId, apuntes, instrucciones);
      setSecciones(borrador.secciones);
      setModeloIa(borrador.modeloIa || "");
      setAviso("Borrador generado. Revísalo y corrígelo antes de guardar.");
    } catch (err) {
      setError(mensajeErrorIa(err, "No se pudo generar el borrador. Intenta nuevamente."));
    } finally {
      setGenerando(false);
    }
  }

  async function handleGuardar() {
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
      setInforme(guardado);
      setAviso("Informe guardado.");
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo guardar el informe.");
    } finally {
      setGuardando(false);
    }
  }

  function cambiarSeccion(indice, contenido) {
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

  // Tarjeta de la evaluación con nota: misma sección y mismos permisos que el informe.
  const tarjetaEvaluacion = (
    <EvaluacionIa
      solicitudId={solicitudId}
      puedeEditar={puedeEditar}
      apuntes={apuntes}
      tieneCv={tieneCv}
      tieneInforme={tieneInforme}
    />
  );

  // Vista de solo lectura para quien no puede editar (por ejemplo, el analista).
  if (!puedeEditar) {
    return (
      <div className="d-flex flex-column gap-4">
        {!hayContenido ? (
          <p className="text-secondary mb-0">
            Todavía no hay un informe para esta solicitud. Solo el evaluador responsable puede generarlo.
          </p>
        ) : (
          <>
            <AvisoIa />
            {secciones.map((seccion) => (
              <div key={seccion.titulo}>
                <h4 className="h6 fw-semibold">{seccion.titulo}</h4>
                <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {seccion.contenido}
                </p>
              </div>
            ))}
            {informe?.generadoPor?.nombre && (
              <p className="small text-secondary mb-0">
                Última edición: {informe.generadoPor.nombre} ·{" "}
                {new Date(informe.generadoEn).toLocaleString()}
                {informe.modeloIa ? ` · borrador inicial generado con ${informe.modeloIa}` : ""}
              </p>
            )}
            <p className="small text-secondary mb-0">
              Puedes consultar el informe; solo el evaluador responsable (o un admin) puede editarlo.
            </p>
          </>
        )}
        {tarjetaEvaluacion}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <AvisoIa />

      <div>
        <label htmlFor={`${prefijoId}-apuntes`} className="form-label">
          Apuntes de la entrevista
        </label>
        <textarea
          id={`${prefijoId}-apuntes`}
          aria-describedby={`${prefijoId}-apuntes-ayuda`}
          value={apuntes}
          onChange={(e) => setApuntes(e.target.value)}
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
          onChange={(e) => setInstrucciones(e.target.value)}
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
          disabled={generando || !apuntes.trim()}
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
            {guardando ? "Guardando..." : "Guardar informe"}
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
      {aviso && (
        <div className="alert alert-success mb-0" role="status">
          {aviso}
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

          {informe?.generadoPor?.nombre && (
            <p className="small text-secondary mb-0">
              Última edición guardada: {informe.generadoPor.nombre} ·{" "}
              {new Date(informe.generadoEn).toLocaleString()}
              {informe.modeloIa ? ` · borrador inicial generado con ${informe.modeloIa}` : ""}
            </p>
          )}
        </div>
      )}

      {tarjetaEvaluacion}
    </div>
  );
}
