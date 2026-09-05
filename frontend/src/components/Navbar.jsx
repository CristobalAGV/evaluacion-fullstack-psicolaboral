import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/">Evaluacion Psicolaboral</Link>
      <div className="navbar-links">
        {usuario ? (
          <>
            <Link to="/">Panel</Link>
            <Link to="/solicitudes/nueva">Nueva solicitud</Link>
            <span>
              {usuario.nombre} ({usuario.rol})
            </span>
            <button onClick={handleLogout}>Cerrar sesion</button>
          </>
        ) : (
          <>
            <Link to="/login">Iniciar sesion</Link>
            <Link to="/registro">Registrarse</Link>
          </>
        )}
      </div>
    </nav>
  );
}
