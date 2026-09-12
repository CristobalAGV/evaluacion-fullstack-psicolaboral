import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const enlaceClases =
  "px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";

export default function Navbar() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="text-slate-900 font-semibold">
          Evaluación Psicolaboral
        </Link>
        <div className="flex items-center gap-1">
          {usuario ? (
            <>
              <Link to="/" className={enlaceClases}>
                Inicio
              </Link>
              <Link to="/panel" className={enlaceClases}>
                Panel
              </Link>
              <Link to="/solicitudes/nueva" className={enlaceClases}>
                Nueva solicitud
              </Link>
              <span className="px-3 py-2 text-sm text-slate-500">
                {usuario.nombre} <span className="text-slate-400">({usuario.rol})</span>
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-white bg-slate-800 hover:bg-slate-700"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={enlaceClases}>
                Iniciar sesión
              </Link>
              <Link
                to="/registro"
                className="px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
