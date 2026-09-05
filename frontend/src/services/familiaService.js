import api from "./api";

export async function listarFamilias() {
  const { data } = await api.get("/familias");
  return data;
}
