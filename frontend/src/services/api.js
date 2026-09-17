import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const apiOrigin = API_URL.replace(/\/api\/?$/, "");

// En estas rutas un 401 significa "credenciales incorrectas", no "sesion expirada".
const RUTAS_PUBLICAS = ["/auth/login", "/auth/registro"];

let manejarNoAutorizado = null;

export function registrarManejadorNoAutorizado(manejador) {
  manejarNoAutorizado = manejador;
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const esRutaPublica = RUTAS_PUBLICAS.some((ruta) => url.includes(ruta));

    if (error.response?.status === 401 && !esRutaPublica && manejarNoAutorizado) {
      manejarNoAutorizado();
    }

    return Promise.reject(error);
  }
);

export default api;
