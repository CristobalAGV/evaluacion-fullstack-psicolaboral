import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// En estas rutas un 401 significa "credenciales incorrectas", no "sesión expirada".
const RUTAS_PUBLICAS = ["/auth/login", "/postulaciones", "/ofertas/publicas"];
const esPublica = (url = "") => {
  const ruta = url.split("?")[0];
  return RUTAS_PUBLICAS.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`));
};

let manejarNoAutorizado = null;

export function registrarManejadorNoAutorizado(manejador) {
  manejarNoAutorizado = manejador;
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !esPublica(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !esPublica(error.config?.url) && manejarNoAutorizado) {
      manejarNoAutorizado();
    }

    return Promise.reject(error);
  }
);

export default api;
