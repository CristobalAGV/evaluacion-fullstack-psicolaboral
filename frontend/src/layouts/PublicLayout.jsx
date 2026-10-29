import { Outlet } from "react-router-dom";
import NavbarPublico from "../components/NavbarPublico";
import Footer from "../components/Footer";

// Marco de las páginas públicas (login, registro, 404 sin sesión): barra simple, contenido
// centrado y pie, sin menú lateral. El <main> crece para dejar el pie al final de la pantalla.
export default function PublicLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <NavbarPublico />
      <main className="flex-fill bg-body-tertiary">
        <div className="container py-4 py-md-5">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
