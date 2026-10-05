// Marca las solicitudes que el propio candidato envió desde el formulario público /postular.
export function esPostulacionPublica(solicitud) {
  return solicitud?.candidato?.origen === "postulacion_publica";
}

export default function EtiquetaPostulacionPublica() {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Postulación pública
    </span>
  );
}
