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
  fechaEvaluacion,
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
  // "" quita la fecha; si el dato no viene (undefined) no se envía y el backend no la toca.
  if (fechaEvaluacion !== undefined) formData.append("fechaEvaluacion", fechaEvaluacion ?? "");
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

// resultado (opcional): "Aprobada", "Rechazada" o null para quitarlo; solo aplica con "Finalizada".
export async function actualizarEstadoSolicitud(id, estado, resultado) {
  const cuerpo = resultado === undefined ? { estado } : { estado, resultado };
  const { data } = await api.patch(`/solicitudes/${id}/estado`, cuerpo);
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
