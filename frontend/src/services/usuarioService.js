import api from "./api";

export async function listarUsuarios(rol) {
  const { data } = await api.get("/usuarios", { params: rol ? { rol } : {} });
  return data;
}
