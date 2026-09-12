import api from "./api";

export async function listarEvaluaciones(solicitudId) {
  const { data } = await api.get(`/solicitudes/${solicitudId}/evaluaciones`);
  return data;
}

export async function crearEvaluacion(solicitudId, { fechaEvaluacion, resultado, estado }) {
  const { data } = await api.post(`/solicitudes/${solicitudId}/evaluaciones`, {
    fechaEvaluacion,
    resultado,
    estado,
  });
  return data;
}

export async function actualizarEvaluacion(id, { fechaEvaluacion, resultado, estado }) {
  const { data } = await api.put(`/evaluaciones/${id}`, { fechaEvaluacion, resultado, estado });
  return data;
}
