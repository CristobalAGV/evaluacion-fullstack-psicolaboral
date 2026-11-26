export const estadosPreseleccion = {
  cumple: { nombre: "Cumple", etiqueta: "Cumple requisitos mínimos", color: "success" },
  revision: { nombre: "Revisión", etiqueta: "Requiere revisión", color: "warning" },
  no_cumple: { nombre: "No cumple", etiqueta: "No cumple requisitos mínimos", color: "danger" },
};

export function requiereContinuidad(resultado) {
  return Boolean(resultado && resultado.estadoPreseleccion !== "cumple" && !resultado.continuidad);
}

export function filtrarPorPreseleccion(solicitudes, estado, nivel, ordenar) {
  const coincidencia = (solicitud) => solicitud.preseleccion?.porcentajeCoincidencia ?? -1;
  const visibles = solicitudes.filter((solicitud) => {
    const preseleccion = solicitud.preseleccion?.estadoPreseleccion ?? "sin_preseleccion";
    const puntos = coincidencia(solicitud);
    return (!estado || preseleccion === estado) && (!nivel || (puntos >= 0 && (nivel === "alta" ? puntos >= 80 : puntos < 80)));
  });
  return ordenar ? visibles.sort((a, b) => coincidencia(b) - coincidencia(a)) : visibles;
}
