import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { enlacesPara } from "../layouts/enlaces";

// Barra superior de la zona privada (AppLayout). Las páginas públicas usan NavbarPublico.
export default function Navbar() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  // El menú desplegable (móvil) se abre y cierra con estado de React, sin el JS de Bootstrap.
  const [abierto, setAbierto] = useState(false);

  function handleLogout() {
    cerrarSesion();
    navigate("/login");
  }

  // Sin sesión (por ejemplo, justo al cerrarla) no hay nada que mostrar: se redirige al login.
  if (!usuario) return null;

  return (
    <nav className="navbar navbar-expand-md bg-white border-bottom">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand fw-semibold">
          Evaluación Psicolaboral
        </Link>
        <button
          type="button"
          className="navbar-toggler"
          aria-controls="menu-navbar"
          aria-expanded={abierto}
          aria-label="Abrir menú"
          onClick={() => setAbierto(!abierto)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div id="menu-navbar" className={`navbar-collapse collapse${abierto ? " show" : ""}`}>
          {/* En escritorio estos enlaces están en el Sidebar; aquí solo se ven en móvil. */}
          <ul className="navbar-nav me-auto d-md-none">
            {enlacesPara(usuario.rol).map((enlace) => (
              <li key={enlace.a} className="nav-item">
                <NavLink to={enlace.a} end className="nav-link" onClick={() => setAbierto(false)}>
                  {enlace.texto}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="ms-md-auto d-flex flex-column flex-md-row align-items-md-center gap-2 py-2 py-md-0">
            <span className="navbar-text">
              {usuario.nombre} <span className="text-body-tertiary">({usuario.rol})</span>
            </span>
            <button type="button" onClick={handleLogout} className="btn btn-dark btn-sm">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
