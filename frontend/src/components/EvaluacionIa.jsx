import { useEffect, useState } from "react";
import { obtenerEvaluacionIa, generarEvaluacionIa, guardarEvaluacionIa } from "../services/informeService";
import { mensajeErrorIa } from "../utils/mensajeErrorIa";

const AVISO_APOYO_IA = "Apoyo generado por IA; la decisión final es del evaluador";

function AvisoApoyo() {
  return (
    <div className="alert alert-info mb-0" role="note">
      ⚠️ {AVISO_APOYO_IA}. La nota resume la evidencia del CV, el informe de entrevista y tus apuntes;
      no es un veredicto sobre la persona.
    </div>
  );
}

function Spinner() {
  return <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />;
}

function ListaDeTextos({ titulo, items }) {
  return (
    <div className="border rounded p-3 h-100 bg-white">
      <h5 className="h6 fw-semibold">{titulo}</h5>
      {items.length === 0 ? (
        <p className="small text-secondary mb-0">Sin evidencia suficiente.</p>
      ) : (
        <ul className="small ps-3 mb-0" style={{ listStyleType: "disc" }}>
          {items.map((item, i) => (
            <li key={i} className="mb-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TEXTO_SIN_EVIDENCIA = "sin evidencia suficiente";

// La justificación de una competencia sin evidencia suele repetir el texto del badge: en ese caso
// (o si viene vacía) no se muestra, para no decir lo mismo dos veces.
function repiteElBadge(competencia) {
  if (competencia.puntaje !== null) return false;
  const texto = (competencia.justificacion ?? "").trim().replace(/\.$/, "").toLowerCase();
  return texto === "" || texto === TEXTO_SIN_EVIDENCIA;
}

// Nota global, competencias con barra y bloques de retroalimentación.
function VistaEvaluacion({ evaluacion }) {
  return (
    <div className="d-flex flex-column gap-4">
      <div className="row g-3 align-items-center">
        <div className="col-12 col-sm-4 col-md-3 text-center" aria-label={`Nota global: ${evaluacion.puntajeGlobal} de 100`}>
          <p className="display-5 fw-bold text-primary mb-1">{evaluacion.puntajeGlobal}</p>
          <span className="badge text-bg-primary">de 100</span>
          <p className="small text-secondary mt-1 mb-0">nivel de ajuste al cargo</p>
        </div>
        <div className="col-12 col-sm-8 col-md-9">
          <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
            {evaluacion.resumen}
          </p>
        </div>
      </div>

      <div>
        <h5 className="h6 fw-semibold mb-3">Competencias</h5>
        <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
          {evaluacion.competencias.map((c) => (
            <li key={c.nombre}>
              <div className="d-flex align-items-baseline justify-content-between gap-2">
                <span className="fw-medium">{c.nombre}</span>
                {c.puntaje === null ? (
                  <span className="badge text-bg-secondary flex-shrink-0">Sin evidencia suficiente</span>
                ) : (
                  <span className="flex-shrink-0 text-secondary">{c.puntaje}/100</span>
                )}
              </div>
              {c.puntaje !== null && (
                <div
                  className="progress mt-1"
                  style={{ height: 8 }}
                  role="progressbar"
                  aria-label={c.nombre}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={c.puntaje}
                >
                  <div className="progress-bar" style={{ width: `${c.puntaje}%` }} />
                </div>
              )}
              {!repiteElBadge(c) && <p className="small text-secondary mt-1 mb-0">{c.justificacion}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4">
          <ListaDeTextos titulo="Fortalezas" items={evaluacion.fortalezas} />
        </div>
        <div className="col-12 col-md-4">
          <ListaDeTextos titulo="Áreas de mejora" items={evaluacion.areasDeMejora} />
        </div>
        <div className="col-12 col-md-4">
          <ListaDeTextos titulo="Recomendaciones para el evaluador" items={evaluacion.recomendaciones} />
        </div>
      </div>
    </div>
  );
}

// Tarjeta de la sección "Informe psicolaboral". puedeEditar sigue la misma regla que el informe
// (evaluador responsable o admin). Los apuntes vienen del informe para no pedirlos dos veces.
export default function EvaluacionIa({ solicitudId, puedeEditar, apuntes = "", tieneCv, tieneInforme }) {
  const [guardada, setGuardada] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    obtenerEvaluacionIa(solicitudId)
      .then((data) => setGuardada(data))
      .catch((err) => setError(err.response?.data?.mensaje || "Error al cargar la evaluación"))
      .finally(() => setCargando(false));
  }, [solicitudId]);

  async function handleGenerar() {
    setError("");
    setAviso("");
    setGenerando(true);
    try {
      setBorrador(await generarEvaluacionIa(solicitudId, apuntes));
    } catch (err) {
      setError(mensajeErrorIa(err, "No se pudo generar la evaluación. Intenta nuevamente."));
    } finally {
      setGenerando(false);
    }
  }

  async function handleConfirmar() {
    setError("");
    setGuardando(true);
    try {
      setGuardada(await guardarEvaluacionIa(solicitudId, borrador));
      setBorrador(null);
      setAviso("Evaluación guardada en la solicitud.");
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo guardar la evaluación.");
    } finally {
      setGuardando(false);
    }
  }

  const faltaArchivo = !tieneCv || !tieneInforme;
  const mostrada = borrador ?? guardada;

  return (
    <section className="card border-primary-subtle">
      <div className="card-header bg-primary-subtle">
        <h4 className="h6 fw-semibold mb-0">Evaluación de apoyo con IA</h4>
      </div>
      <div className="card-body d-flex flex-column gap-3">
        <p className="small text-secondary mb-0">
          Retroalimentación y nota de ajuste al cargo a partir del CV y del informe de entrevista (Word) del
          candidato.
        </p>

        <AvisoApoyo />

        {cargando ? (
          <div className="d-flex align-items-center gap-2 text-secondary" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
            <span>Cargando evaluación...</span>
          </div>
        ) : (
          <>
            {puedeEditar && (
              <div className="d-flex flex-column gap-2">
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGenerar}
                    disabled={generando || guardando || faltaArchivo}
                    className="btn btn-primary"
                  >
                    {generando && <Spinner />}
                    {generando ? "Generando..." : "Generar evaluación con IA"}
                  </button>
                  {borrador && (
                    <>
                      <button
                        type="button"
                        onClick={handleConfirmar}
                        disabled={guardando || generando}
                        className="btn btn-success"
                      >
                        {guardando && <Spinner />}
                        {guardando ? "Guardando..." : "Confirmar y guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBorrador(null)}
                        disabled={guardando || generando}
                        className="btn btn-outline-secondary"
                      >
                        Descartar borrador
                      </button>
                    </>
                  )}
                </div>
                {faltaArchivo && (
                  <p className="small text-secondary mb-0">
                    Para generarla, el candidato debe tener cargados el CV y el informe de entrevista.
                  </p>
                )}
              </div>
            )}

            {generando && (
              <div className="d-flex align-items-center gap-2 text-secondary" role="status">
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                <span>Generando… puede tardar hasta 1 minuto.</span>
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

            {borrador && (
              <div className="alert alert-warning mb-0 py-2" role="note">
                <p className="small fw-semibold text-uppercase mb-1">
                  Borrador sin guardar: revísalo y confírmalo para guardarlo en la solicitud
                </p>
                {borrador.avisos?.map((avisoIa) => (
                  <p key={avisoIa} className="small mb-0">
                    {avisoIa}
                  </p>
                ))}
              </div>
            )}

            {mostrada ? (
              <VistaEvaluacion evaluacion={mostrada} />
            ) : (
              !puedeEditar && (
                <p className="text-secondary mb-0">
                  Todavía no hay una evaluación guardada. Solo el evaluador responsable (o un admin) puede
                  generarla.
                </p>
              )
            )}

            {!borrador && guardada?.generadoPor?.nombre && (
              <p className="small text-secondary mb-0">
                Guardada por {guardada.generadoPor.nombre} · {new Date(guardada.generadoEn).toLocaleString()}
                {guardada.modeloIa ? ` · generada con ${guardada.modeloIa}` : ""}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
