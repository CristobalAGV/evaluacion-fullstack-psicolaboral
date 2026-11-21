import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ArchivoDescargable from "./ArchivoDescargable";
import ReemplazarCv from "./ReemplazarCv";
import { descargarPautaEntrevista } from "../services/archivoService";
import { obtenerExpediente } from "../services/solicitudService";

export default function ExpedientePostulante({ solicitudId, puedeGestionar, onCvReemplazado }) {
  const [expediente, setExpediente] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [errorRefresco, setErrorRefresco] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    obtenerExpediente(solicitudId)
      .then((datos) => { if (vigente) setExpediente(datos); })
      .catch((err) => {
        if (!vigente) return;
        const mensaje = err.response?.data?.mensaje || "No se pudo consultar el expediente.";
        if (revision) setErrorRefresco(mensaje);
        else setError(mensaje);
      });
    return () => { vigente = false; };
  }, [solicitudId, revision]);

  function alReemplazarCv(cv) {
    setExpediente((actual) => ({ ...actual, documentos: { ...actual.documentos, cv } }));
    onCvReemplazado(cv);
    setAviso("CV reemplazado correctamente.");
    setErrorRefresco("");
    setRevision((actual) => actual + 1);
  }

  if (error) return <p role="alert" className="alert alert-warning mb-0">{error}</p>;
  if (!expediente) return <p role="status" className="text-secondary mb-0">Cargando expediente…</p>;

  const { candidato, carpeta, familia, oferta, documentos, estado } = expediente;
  const campos = {
    "ID del candidato": candidato?._id,
    "ID de la solicitud": expediente.solicitudId,
    Contenedor: carpeta ? <code className="text-break">{carpeta}</code> : "No disponible",
    "Oferta asociada": oferta && (puedeGestionar
      ? <Link to={`/gestion/ofertas/${oferta._id}`}>{oferta.cargo}</Link>
      : oferta.cargo),
    "Familia de cargo": familia?.nombre,
    "Estado del expediente": estado,
  };

  return (
    <>
      <p className="small text-body-secondary mb-0">
        Este expediente agrupa los documentos asociados al proceso del postulante. Los archivos del postulante se almacenan de forma privada y solo pueden ser consultados por usuarios autorizados.
      </p>
      {candidato?.nombre && <p className="fw-semibold mb-0">{candidato.nombre}</p>}
      <dl className="small mb-0">
        {Object.entries(campos).filter(([, valor]) => valor).map(([etiqueta, valor]) => (
          <div key={etiqueta} className="mb-2">
            <dt className="text-body-secondary">{etiqueta}</dt>
            <dd className="text-break mb-0">{valor}</dd>
          </div>
        ))}
      </dl>
      <ArchivoDescargable etiqueta="CV" archivo={documentos?.cv} textoNoDisponible="No disponible"
        acciones={puedeGestionar && documentos?.cv &&
          <ReemplazarCv solicitudId={solicitudId} alReemplazar={alReemplazarCv} />} />
      {aviso && <p role="status" className="alert alert-success py-2 mb-0">{aviso}</p>}
      {errorRefresco && <p role="alert" className="alert alert-warning py-2 mb-0">{errorRefresco}</p>}
      <ArchivoDescargable etiqueta="Informe de entrevista" archivo={documentos?.informe} textoNoDisponible="No disponible" />
      <ArchivoDescargable
        etiqueta={familia?.nombre ? `Pauta de entrevista · ${familia.nombre}` : "Pauta de entrevista"}
        descargar={documentos?.pauta ? () => descargarPautaEntrevista(solicitudId) : undefined}
        textoDescarga="Descargar pauta de entrevista"
        textoNoDisponible="No disponible"
      />
      {documentos?.pauta && (
        <p className="form-text mb-0">Completa esta pauta durante o después de la entrevista y vuelve a subirla en formato Word.</p>
      )}
    </>
  );
}
