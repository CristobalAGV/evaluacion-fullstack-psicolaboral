import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerInforme, generarInforme, guardarInforme } from "../services/informeService";

const ROLES_QUE_EDITAN = ["evaluador", "admin"];

const campoClases =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function AvisoIa() {
  return (
    <div className="rounded-md border-l-4 border-amber-500 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        ⚠️ Borrador generado por inteligencia artificial
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Este texto es una <strong>propuesta inicial</strong> y puede contener errores, omisiones o
        interpretaciones incorrectas de los apuntes. <strong>Debe ser revisado, corregido y validado
        por el profesional evaluador</strong> antes de usarse o compartirse. Un informe psicolaboral
        incide en la decisión de contratación de una persona: la responsabilidad del contenido final
        es siempre del profesional, no del sistema.
      </p>
    </div>
  );
}

export default function InformePsicolaboral({ solicitudId }) {
  const { usuario } = useAuth();
  const puedeEditar = ROLES_QUE_EDITAN.includes(usuario?.rol);

  const [informe, setInforme] = useState(null);
  const [apuntes, setApuntes] = useState("");
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
      const borrador = await generarInforme(solicitudId, apuntes);
      setSecciones(borrador.secciones);
      setModeloIa(borrador.modeloIa || "");
      setAviso("Borrador generado. Revísalo y corrígelo antes de guardar.");
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo generar el borrador. Intenta nuevamente.");
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
    return <p className="text-sm text-slate-500">Cargando informe...</p>;
  }

  const hayContenido = secciones.length > 0;

  // Vista de solo lectura para quien no puede editar (por ejemplo, el analista).
  if (!puedeEditar) {
    return (
      <div className="flex flex-col gap-4">
        {!hayContenido ? (
          <p className="text-sm text-slate-400">
            Todavía no hay un informe para esta solicitud. Solo un evaluador puede generarlo.
          </p>
        ) : (
          <>
            <AvisoIa />
            {secciones.map((seccion) => (
              <div key={seccion.titulo}>
                <h4 className="text-sm font-semibold text-slate-900">{seccion.titulo}</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{seccion.contenido}</p>
              </div>
            ))}
            {informe?.generadoPor?.nombre && (
              <p className="text-xs text-slate-400">
                Última edición: {informe.generadoPor.nombre} ·{" "}
                {new Date(informe.generadoEn).toLocaleString()}
                {informe.modeloIa ? ` · borrador inicial generado con ${informe.modeloIa}` : ""}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Tu rol ({usuario?.rol}) permite consultar el informe, pero no editarlo.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AvisoIa />

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Apuntes de la entrevista
        <span className="text-xs text-slate-500">
          Escribe o pega aquí tus observaciones. La IA redactará el borrador únicamente a partir de
          este texto.
        </span>
        <textarea
          value={apuntes}
          onChange={(e) => setApuntes(e.target.value)}
          rows={7}
          placeholder="Ej.: Candidata con 4 años de experiencia en atención de público. Relata manejo de reclamos..."
          className={`${campoClases} mt-1`}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerar}
          disabled={generando || !apuntes.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
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
            className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar informe"}
          </button>
        )}
      </div>

      {generando && (
        <p className="text-sm text-slate-500">
          Redactando el borrador, esto puede tardar unos segundos. Tus apuntes no se pierden.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {aviso && <p className="text-sm text-emerald-700">{aviso}</p>}

      {hayContenido && (
        <div className="flex flex-col gap-4 border-t border-slate-200 pt-4">
          {secciones.map((seccion, indice) => (
            <label key={seccion.titulo} className="flex flex-col gap-1 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{seccion.titulo}</span>
              <textarea
                value={seccion.contenido}
                onChange={(e) => cambiarSeccion(indice, e.target.value)}
                rows={5}
                className={campoClases}
              />
            </label>
          ))}

          {informe?.generadoPor?.nombre && (
            <p className="text-xs text-slate-400">
              Última edición guardada: {informe.generadoPor.nombre} ·{" "}
              {new Date(informe.generadoEn).toLocaleString()}
              {informe.modeloIa ? ` · borrador inicial generado con ${informe.modeloIa}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
