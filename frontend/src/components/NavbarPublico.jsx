import { Link, useLocation } from "react-router-dom";

// Barra de las páginas públicas: la marca y el enlace que corresponde a la pantalla actual
// (en el login se ofrece registrarse; en el registro, iniciar sesión; en otras, ambos).
export default function NavbarPublico() {
  const { pathname } = useLocation();
  const enRegistro = pathname === "/registro";
  const enLogin = pathname === "/login";

  return (
    <nav className="navbar bg-white border-bottom">
      <div className="container-fluid">
        <Link to="/login" className="navbar-brand fw-semibold">
          Evaluación Psicolaboral
        </Link>
        <div className="d-flex align-items-center gap-2">
          {!enLogin && (
            <Link to="/login" className={enRegistro ? "btn btn-primary btn-sm" : "btn btn-outline-primary btn-sm"}>
              Iniciar sesión
            </Link>
          )}
          {!enRegistro && (
            <Link to="/registro" className={enLogin ? "btn btn-primary btn-sm" : "btn btn-outline-primary btn-sm"}>
              Registrarse
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
