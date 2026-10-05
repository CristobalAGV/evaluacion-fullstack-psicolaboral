import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SelectorCv from "../components/SelectorCv";
import { listarFamiliasPublicas, enviarPostulacion } from "../services/postulacionService";

const campoClases =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

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

  useEffect(() => {
    listarFamiliasPublicas()
      .then(setFamilias)
      .catch(() => setError("No pudimos cargar los cargos disponibles. Recarga la página."))
      .finally(() => setCargandoFamilias(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

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

  if (enviada) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Postulación recibida</h2>
        <p className="text-sm text-slate-600">
          Gracias, {nombre.trim().split(" ")[0]}. Recibimos tus datos y tu CV. El equipo de selección revisará tu
          postulación y te contactará al correo o teléfono que indicaste.
        </p>
      </div>
    );
  }

  const telefonoInvalido = telefono.trim() !== "" && !TELEFONO_REGEX.test(telefono.trim());
  const errorArchivo = cv ? validarArchivoCv(cv) : "";

  return (
    <div className="max-w-lg mx-auto mt-6 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
      <h1 className="text-xl font-semibold text-slate-900">Postula a un cargo</h1>
      <p className="text-sm text-slate-600 mt-1 mb-5">
        Completa tus datos y adjunta tu CV. No necesitas crear una cuenta.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Nombre completo
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            minLength={3}
            maxLength={100}
            autoComplete="name"
            className={campoClases}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Correo
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              maxLength={254}
              placeholder="nombre@ejemplo.cl"
              autoComplete="email"
              className={campoClases}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Teléfono
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              placeholder="+56 9 1234 5678"
              autoComplete="tel"
              aria-invalid={telefonoInvalido}
              className={`${campoClases} ${telefonoInvalido ? "border-red-500 focus:ring-red-500" : ""}`}
            />
            {telefonoInvalido && <span className="text-xs text-red-600">{MENSAJE_TELEFONO}</span>}
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Área de interés
          <select
            value={familiaDeCargo}
            onChange={(e) => setFamiliaDeCargo(e.target.value)}
            required
            disabled={cargandoFamilias}
            className={campoClases}
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
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Cargo al que postulas
          <input
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder="Por ejemplo: Ejecutivo de ventas"
            className={campoClases}
          />
        </label>

        <SelectorCv etiqueta="CV" archivo={cv} onChange={setCv} required />
        {errorArchivo && <p className="text-xs text-red-600 -mt-2">{errorArchivo}</p>}

        {/* Campo trampa para bots: oculto para las personas y fuera del orden de tabulación. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando || cargandoFamilias || telefonoInvalido || Boolean(errorArchivo)}
          className="rounded-md bg-indigo-600 text-white font-medium py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar postulación"}
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-500">
        ¿Eres parte del equipo de selección?{" "}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
