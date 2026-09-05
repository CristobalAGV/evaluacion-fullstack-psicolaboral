import api from "./api";

export async function listarSolicitudes() {
  const { data } = await api.get("/solicitudes");
  return data;
}

export async function crearSolicitud({ candidato, familiaDeCargo, cargo, cv }) {
  const formData = new FormData();
  formData.append("candidato", candidato);
  formData.append("familiaDeCargo", familiaDeCargo);
  formData.append("cargo", cargo);
  formData.append("cv", cv);

  const { data } = await api.post("/solicitudes", formData);
  return data;
}

export async function actualizarSolicitud(id, { candidato, familiaDeCargo, cargo, cv }) {
  const formData = new FormData();
  formData.append("candidato", candidato);
  formData.append("familiaDeCargo", familiaDeCargo);
  formData.append("cargo", cargo);
  if (cv) formData.append("cv", cv);

  const { data } = await api.put(`/solicitudes/${id}`, formData);
  return data;
}

export async function actualizarEstadoSolicitud(id, estado) {
  const { data } = await api.patch(`/solicitudes/${id}/estado`, { estado });
  return data;
}

export async function eliminarSolicitud(id) {
  const { data } = await api.delete(`/solicitudes/${id}`);
  return data;
}
