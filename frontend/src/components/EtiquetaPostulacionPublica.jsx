// Marca las solicitudes que el propio candidato envió desde el formulario público /postular.
export function esPostulacionPublica(solicitud) {
  return solicitud?.candidato?.origen === "postulacion_publica";
}

export default function EtiquetaPostulacionPublica() {
  return <span className="badge rounded-pill text-bg-success align-self-start">Postulación pública</span>;
}
