import api from "./api";

export async function obtenerInforme(solicitudId) {
  const { data } = await api.get(`/solicitudes/${solicitudId}/informe`);
  return data;
}

export async function generarInforme(solicitudId, apuntes) {
  const { data } = await api.post(`/solicitudes/${solicitudId}/informe/generar`, { apuntes });
  return data;
}

export async function guardarInforme(solicitudId, { secciones, apuntes, modeloIa, estado }) {
  const { data } = await api.put(`/solicitudes/${solicitudId}/informe`, {
    secciones,
    apuntes,
    modeloIa,
    estado,
  });
  return data;
}
