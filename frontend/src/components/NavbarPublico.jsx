import { Link, useLocation } from "react-router-dom";

// Barra de las páginas públicas: la marca y el enlace que corresponde a la pantalla actual
// (en el login se ofrece registrarse; en el registro, iniciar sesión; en otras, ambos).
// En /postular entra un candidato externo, así que solo se muestra la marca.
export default function NavbarPublico() {
  const { pathname } = useLocation();
  const soloMarca = pathname === "/postular";
  const enRegistro = pathname === "/registro";
  const enLogin = pathname === "/login";

  return (
    <nav className="navbar bg-white border-bottom">
      <div className="container-fluid">
        <Link to={soloMarca ? "/postular" : "/login"} className="navbar-brand fw-semibold">
          Evaluación Psicolaboral
        </Link>
        {!soloMarca && (
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
        )}
      </div>
    </nav>
  );
}
