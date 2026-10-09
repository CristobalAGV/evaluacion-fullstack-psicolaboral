import api from "./api";

export async function obtenerInforme(solicitudId) {
  const { data } = await api.get(`/solicitudes/${solicitudId}/informe`);
  return data;
}

export async function generarInforme(solicitudId, apuntes, instrucciones) {
  const { data } = await api.post(`/solicitudes/${solicitudId}/informe/generar`, {
    apuntes,
    instrucciones,
  });
  return data;
}

export async function guardarInforme(
  solicitudId,
  { secciones, apuntes, instrucciones, modeloIa, estado }
) {
  const { data } = await api.put(`/solicitudes/${solicitudId}/informe`, {
    secciones,
    apuntes,
    instrucciones,
    modeloIa,
    estado,
  });
  return data;
}

// Evaluación de apoyo con nota (CV + informe de entrevista).
export async function obtenerEvaluacionIa(solicitudId) {
  const { data } = await api.get(`/solicitudes/${solicitudId}/informe/evaluacion`);
  return data;
}

export async function generarEvaluacionIa(solicitudId, apuntes) {
  const { data } = await api.post(`/solicitudes/${solicitudId}/informe/evaluacion/generar`, { apuntes });
  return data;
}

export async function guardarEvaluacionIa(
  solicitudId,
  { puntajeGlobal, competencias, fortalezas, areasDeMejora, recomendaciones, resumen, modeloIa }
) {
  const { data } = await api.put(`/solicitudes/${solicitudId}/informe/evaluacion`, {
    puntajeGlobal,
    competencias,
    fortalezas,
    areasDeMejora,
    recomendaciones,
    resumen,
    modeloIa,
  });
  return data;
}
