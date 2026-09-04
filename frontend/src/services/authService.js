import api from "./api";

export async function login(correo, password) {
  const { data } = await api.post("/auth/login", { correo, password });
  return data;
}

export async function registrar(nombre, correo, password, rol) {
  const { data } = await api.post("/auth/registro", { nombre, correo, password, rol });
  return data;
}

export async function obtenerPerfil() {
  const { data } = await api.get("/auth/perfil");
  return data;
}
