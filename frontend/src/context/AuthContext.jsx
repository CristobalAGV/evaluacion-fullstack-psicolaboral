import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as authService from "../services/authService";
import { registrarManejadorNoAutorizado } from "../services/api";

const AuthContext = createContext(null);

const MENSAJE_SESION_EXPIRADA = "Tu sesión expiró, vuelve a iniciar sesión";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });
  const [mensajeSesion, setMensajeSesion] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    registrarManejadorNoAutorizado(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      setUsuario(null);
      setMensajeSesion(MENSAJE_SESION_EXPIRADA);
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  async function iniciarSesion(correo, password) {
    const data = await authService.login(correo, password);
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    setMensajeSesion("");
    return data.usuario;
  }

  async function registrarUsuario(nombre, correo, password, rol) {
    const data = await authService.registrar(nombre, correo, password, rol);
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    setMensajeSesion("");
    return data.usuario;
  }

  function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
    setMensajeSesion("");
  }

  const value = { usuario, mensajeSesion, iniciarSesion, registrarUsuario, cerrarSesion };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
