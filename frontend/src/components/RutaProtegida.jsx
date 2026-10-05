import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// roles (opcional): si se indica, solo esos roles pueden entrar; el resto vuelve al inicio.
export default function RutaProtegida({ children, roles }) {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
