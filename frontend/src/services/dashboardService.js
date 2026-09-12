import api from "./api";

export async function obtenerDashboard() {
  const { data } = await api.get("/dashboard");
  return data;
}
