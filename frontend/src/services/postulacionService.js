import api from "./api";

export async function listarFamiliasPublicas() {
  const { data } = await api.get("/postulaciones/familias");
  return data;
}

export async function enviarPostulacion({ nombre, correo, telefono, familiaDeCargo, cargo, cv, sitioWeb }) {
  const formData = new FormData();
  formData.append("nombre", nombre);
  formData.append("correo", correo);
  formData.append("telefono", telefono);
  formData.append("familiaDeCargo", familiaDeCargo);
  formData.append("cargo", cargo);
  formData.append("sitioWeb", sitioWeb || "");
  formData.append("cv", cv);
  const { data } = await api.post("/postulaciones", formData);
  return data;
}
