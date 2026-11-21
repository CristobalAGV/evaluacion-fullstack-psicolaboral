import { useRef, useState } from "react";
import Modal from "./Modal";
import { reemplazarCvSolicitud } from "../services/solicitudService";

const MAXIMO_CV = 5 * 1024 * 1024;

export default function ReemplazarCv({ solicitudId, alReemplazar }) {
  const selector = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  function seleccionar(evento) {
    const nuevo = evento.currentTarget.files[0];
    evento.currentTarget.value = "";
    if (!nuevo) return;
    if (!/\.pdf$/i.test(nuevo.name) || (nuevo.type && nuevo.type !== "application/pdf")) {
      setError("Selecciona un archivo PDF.");
    } else if (nuevo.size > MAXIMO_CV) {
      setError("El CV supera el tamaño máximo de 5 MB.");
    } else {
      setError("");
      setArchivo(nuevo);
    }
  }

  function cerrar() {
    if (guardando) return;
    setArchivo(null);
    setError("");
  }

  async function confirmar() {
    setGuardando(true);
    setError("");
    try {
      const cv = await reemplazarCvSolicitud(solicitudId, archivo);
      setArchivo(null);
      alReemplazar(cv);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo reemplazar el CV.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <input ref={selector} type="file" accept=".pdf,application/pdf" hidden aria-label="Seleccionar nuevo CV" onChange={seleccionar} />
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => selector.current?.click()}>
        Reemplazar CV
      </button>
      {!archivo && error && <p className="small text-danger mt-2 mb-0" role="alert">{error}</p>}
      {archivo && <Modal etiqueta="Confirmar reemplazo del CV" onCerrar={cerrar} pie={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={cerrar} disabled={guardando}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={confirmar} disabled={guardando}>
            {guardando ? "Reemplazando…" : "Confirmar reemplazo"}
          </button>
        </>
      }>
        <p>¿Deseas reemplazar el CV actual? El archivo anterior dejará de estar asociado a esta solicitud.</p>
        <p className="text-break mb-0">{archivo.name}</p>
        {error && <p className="text-danger mt-2 mb-0" role="alert">{error}</p>}
      </Modal>}
    </>
  );
}
