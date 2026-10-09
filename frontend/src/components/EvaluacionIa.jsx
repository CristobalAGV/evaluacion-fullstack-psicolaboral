import { useEffect, useState } from "react";
import { obtenerEvaluacionIa, generarEvaluacionIa, guardarEvaluacionIa } from "../services/informeService";
import { mensajeErrorIa } from "../utils/mensajeErrorIa";

const AVISO_APOYO_IA = "Apoyo generado por IA; la decisión final es del evaluador";

function AvisoApoyo() {
  return (
    <p className="rounded-md border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
      ⚠️ {AVISO_APOYO_IA}. La nota resume la evidencia del CV, el informe de entrevista y tus apuntes;
      no es un veredicto sobre la persona.
    </p>
  );
}

function ListaDeTextos({ titulo, items }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <h5 className="text-sm font-semibold text-slate-900">{titulo}</h5>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">Sin evidencia suficiente.</p>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Nota global, competencias con barra y bloques de retroalimentación.
function VistaEvaluacion({ evaluacion }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="text-center sm:w-40 sm:shrink-0" aria-label={`Nota global: ${evaluacion.puntajeGlobal} de 100`}>
          <p className="text-5xl font-bold text-indigo-700">{evaluacion.puntajeGlobal}</p>
          <p className="text-xs text-slate-500">de 100 · nivel de ajuste al cargo</p>
        </div>
        <p className="whitespace-pre-line text-sm text-slate-700">{evaluacion.resumen}</p>
      </div>

      <div>
        <h5 className="mb-2 text-sm font-semibold text-slate-900">Competencias</h5>
        <ul className="flex flex-col gap-3">
          {evaluacion.competencias.map((c) => (
            <li key={c.nombre}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800">{c.nombre}</span>
                <span className="shrink-0 text-slate-600">{c.puntaje === null ? "Sin evidencia" : `${c.puntaje}/100`}</span>
              </div>
              <div
                className="mt-1 h-2 rounded-full bg-slate-100"
                role="progressbar"
                aria-label={c.nombre}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={c.puntaje ?? undefined}
              >
                {c.puntaje !== null && (
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${c.puntaje}%` }} />
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">{c.justificacion}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ListaDeTextos titulo="Fortalezas" items={evaluacion.fortalezas} />
        <ListaDeTextos titulo="Áreas de mejora" items={evaluacion.areasDeMejora} />
        <ListaDeTextos titulo="Recomendaciones para el evaluador" items={evaluacion.recomendaciones} />
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
    <section className="flex flex-col gap-4 rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
      <div>
        <h4 className="text-base font-semibold text-slate-900">Evaluación de apoyo con IA</h4>
        <p className="mt-1 text-sm text-slate-600">
          Retroalimentación y nota de ajuste al cargo a partir del CV y del informe de entrevista (Word) del
          candidato.
        </p>
      </div>

      <AvisoApoyo />

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando evaluación...</p>
      ) : (
        <>
          {puedeEditar && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerar}
                  disabled={generando || guardando || faltaArchivo}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {generando ? "Generando..." : "Generar evaluación con IA"}
                </button>
                {borrador && (
                  <>
                    <button
                      type="button"
                      onClick={handleConfirmar}
                      disabled={guardando || generando}
                      className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {guardando ? "Guardando..." : "Confirmar y guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorrador(null)}
                      disabled={guardando || generando}
                      className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Descartar borrador
                    </button>
                  </>
                )}
              </div>
              {faltaArchivo && (
                <p className="text-xs text-slate-500">
                  Para generarla, el candidato debe tener cargados el CV y el informe de entrevista.
                </p>
              )}
            </div>
          )}

          {generando && (
            <p className="text-sm text-slate-500" role="status">
              Generando… puede tardar hasta 1 minuto.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {aviso && <p className="text-sm text-emerald-700">{aviso}</p>}

          {borrador && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Borrador sin guardar: revísalo y confírmalo para guardarlo en la solicitud
              </p>
              {borrador.avisos?.map((avisoIa) => (
                <p key={avisoIa} className="text-xs text-amber-700">
                  {avisoIa}
                </p>
              ))}
            </div>
          )}

          {mostrada ? (
            <VistaEvaluacion evaluacion={mostrada} />
          ) : (
            !puedeEditar && (
              <p className="text-sm text-slate-400">
                Todavía no hay una evaluación guardada. Solo el evaluador responsable (o un admin) puede generarla.
              </p>
            )
          )}

          {!borrador && guardada?.generadoPor?.nombre && (
            <p className="text-xs text-slate-400">
              Guardada por {guardada.generadoPor.nombre} · {new Date(guardada.generadoEn).toLocaleString()}
              {guardada.modeloIa ? ` · generada con ${guardada.modeloIa}` : ""}
            </p>
          )}
        </>
      )}
    </section>
  );
}
