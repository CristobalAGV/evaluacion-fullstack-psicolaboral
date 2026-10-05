import api from "./api";

export async function listarSolicitudes() {
  const { data } = await api.get("/solicitudes");
  return data;
}

export async function obtenerSolicitud(id) {
  const { data } = await api.get(`/solicitudes/${id}`);
  return data;
}

function construirFormData({
  candidatoNombre,
  candidatoCorreo,
  candidatoTelefono,
  familiaDeCargo,
  cargo,
  observaciones,
  profesionalResponsable,
  cv,
}) {
  const formData = new FormData();
  formData.append("candidatoNombre", candidatoNombre);
  formData.append("candidatoCorreo", candidatoCorreo);
  formData.append("candidatoTelefono", candidatoTelefono);
  formData.append("familiaDeCargo", familiaDeCargo);
  formData.append("cargo", cargo);
  formData.append("observaciones", observaciones || "");
  formData.append("profesionalResponsable", profesionalResponsable);
  if (cv) formData.append("cv", cv);
  return formData;
}

export async function crearSolicitud(datos) {
  const { data } = await api.post("/solicitudes", construirFormData(datos));
  return data;
}

export async function actualizarSolicitud(id, datos) {
  const { data } = await api.put(`/solicitudes/${id}`, construirFormData(datos));
  return data;
}

export async function actualizarEstadoSolicitud(id, estado) {
  const { data } = await api.patch(`/solicitudes/${id}/estado`, { estado });
  return data;
}

export async function subirInformeEntrevista(id, archivo) {
  const formData = new FormData();
  formData.append("informe", archivo);
  const { data } = await api.put(`/solicitudes/${id}/informe-entrevista`, formData);
  return data;
}

export async function eliminarSolicitud(id) {
  const { data } = await api.delete(`/solicitudes/${id}`);
  return data;
}
