import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { enlacesPara } from "../layouts/enlaces";

// Menú lateral de escritorio. NavLink agrega la clase "active" al enlace de la ruta actual.
// "end" evita que Inicio ("/") quede activo en todas las rutas.
export default function Sidebar() {
  const { usuario } = useAuth();
  const enlaces = usuario ? enlacesPara(usuario.rol) : [];

  return (
    <aside className="sidebar bg-white border-end p-3" aria-label="Menú lateral">
      <ul className="nav nav-pills flex-column gap-1">
        {enlaces.map((enlace) => (
          <li key={enlace.a} className="nav-item">
            <NavLink to={enlace.a} end className="nav-link">
              {enlace.texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
