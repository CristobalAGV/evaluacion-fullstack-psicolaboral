// Layouts: el marco de la zona privada (AppLayout = Navbar + Sidebar + contenido + Footer), el
// menú lateral según el rol, la página 404 y la redirección al login. Para el marco se usan
// páginas hijas de mentira (sin llamadas al backend); para el 404 y el login, la App real.
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import AppLayout from "../layouts/AppLayout";
import Sidebar from "../components/Sidebar";
import { iniciarSesionSimulada, limpiarSesion, simularGet, USUARIOS } from "./ayudantes";

// AppLayout con dos páginas hijas de mentira, igual que lo usa App.jsx.
function renderizarLayout(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>Contenido de inicio</p>} />
            <Route path="/panel" element={<p>Contenido del panel</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderizarApp(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

const barraSuperior = () => screen.getByRole("navigation");
const menuLateral = () => screen.getByRole("complementary", { name: "Menú lateral" });
const nombresDeEnlaces = (contenedor) => within(contenedor).getAllByRole("link").map((enlace) => enlace.textContent);

describe("Layouts", () => {
  beforeEach(() => limpiarSesion());
  afterEach(() => limpiarSesion());

  describe("AppLayout", () => {
    it("muestra Navbar, Sidebar, Footer y el contenido de la página hija (Outlet)", () => {
      iniciarSesionSimulada(USUARIOS.analista);

      renderizarLayout("/");

      expect(within(barraSuperior()).getByText("Evaluación Psicolaboral")).toBeTruthy();
      expect(menuLateral()).toBeTruthy();
      expect(screen.getByRole("contentinfo")).toBeTruthy();
      expect(within(screen.getByRole("main")).getByText("Contenido de inicio")).toBeTruthy();
    });

    it("mantiene el marco al navegar entre dos rutas hijas y solo cambia el contenido", () => {
      iniciarSesionSimulada(USUARIOS.analista);
      renderizarLayout("/");
      const navbar = barraSuperior();
      const sidebar = menuLateral();

      fireEvent.click(within(sidebar).getByRole("link", { name: "Panel" }));

      expect(screen.getByText("Contenido del panel")).toBeTruthy();
      expect(screen.queryByText("Contenido de inicio")).toBeNull();
      // Son los mismos elementos del DOM: el marco no se volvió a montar.
      expect(barraSuperior()).toBe(navbar);
      expect(menuLateral()).toBe(sidebar);
      expect(screen.getByRole("contentinfo")).toBeTruthy();
    });

    it("el menú del Navbar (móvil) ofrece los mismos enlaces que el Sidebar y se abre con el botón", () => {
      iniciarSesionSimulada(USUARIOS.analista);
      renderizarLayout("/");
      const boton = screen.getByRole("button", { name: "Abrir menú" });
      const menu = document.getElementById("menu-navbar");

      expect(boton.getAttribute("aria-expanded")).toBe("false");
      expect(menu.classList.contains("show")).toBe(false);

      fireEvent.click(boton);

      expect(boton.getAttribute("aria-expanded")).toBe("true");
      expect(menu.classList.contains("show")).toBe(true);
      expect(nombresDeEnlaces(menu)).toEqual(nombresDeEnlaces(menuLateral()));

      fireEvent.click(within(menu).getByRole("link", { name: "Panel" }));

      expect(screen.getByText("Contenido del panel")).toBeTruthy();
      expect(menu.classList.contains("show")).toBe(false);
    });

    it("sin sesión, el menú del Navbar ofrece iniciar sesión y registrarse, y se cierra al elegir uno", () => {
      renderizarApp("/login");
      const boton = screen.getByRole("button", { name: "Abrir menú" });
      const menu = document.getElementById("menu-navbar");
      fireEvent.click(boton);
      expect(menu.classList.contains("show")).toBe(true);

      fireEvent.click(within(menu).getByRole("link", { name: "Registrarse" }));

      expect(menu.classList.contains("show")).toBe(false);
      expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeTruthy();
    });

    it("el Navbar muestra el nombre y el rol del usuario y permite cerrar sesión", () => {
      iniciarSesionSimulada(USUARIOS.evaluador);

      renderizarLayout("/");

      expect(within(barraSuperior()).getByText("Eva Evaluadora")).toBeTruthy();
      expect(within(barraSuperior()).getByText("(evaluador)")).toBeTruthy();
      expect(within(barraSuperior()).getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
    });
  });

  describe("Sidebar", () => {
    it('marca con "active" solo el enlace de la ruta actual', () => {
      iniciarSesionSimulada(USUARIOS.analista);

      renderizarLayout("/panel");

      const sidebar = menuLateral();
      expect(within(sidebar).getByRole("link", { name: "Panel" }).classList.contains("active")).toBe(true);
      expect(within(sidebar).getByRole("link", { name: "Inicio" }).classList.contains("active")).toBe(false);
      expect(within(sidebar).getByRole("link", { name: "Nueva solicitud" }).classList.contains("active")).toBe(false);
    });

    it('cambia el enlace "active" al navegar', () => {
      iniciarSesionSimulada(USUARIOS.analista);
      renderizarLayout("/");
      const sidebar = menuLateral();
      expect(within(sidebar).getByRole("link", { name: "Inicio" }).classList.contains("active")).toBe(true);

      fireEvent.click(within(sidebar).getByRole("link", { name: "Panel" }));

      expect(within(sidebar).getByRole("link", { name: "Panel" }).classList.contains("active")).toBe(true);
      expect(within(sidebar).getByRole("link", { name: "Inicio" }).classList.contains("active")).toBe(false);
    });

    it.each([
      ["analista", ["Inicio", "Panel", "Nueva solicitud"]],
      ["evaluador", ["Inicio", "Panel"]],
      ["admin", ["Inicio", "Panel", "Nueva solicitud"]],
    ])("para el rol %s muestra solo los enlaces permitidos", (rol, esperados) => {
      iniciarSesionSimulada(USUARIOS[rol]);

      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(nombresDeEnlaces(menuLateral())).toEqual(esperados);
    });

    it("sin sesión no muestra ningún enlace", () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(within(menuLateral()).queryAllByRole("link")).toEqual([]);
    });
  });

  describe("Rutas de App", () => {
    it("una ruta inexistente muestra la página 404 con un enlace de vuelta al inicio", () => {
      renderizarApp("/esta-ruta-no-existe");

      expect(screen.getByRole("heading", { name: "Página no encontrada" })).toBeTruthy();
      expect(screen.getByText("404")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Volver al inicio" }).getAttribute("href")).toBe("/");
    });

    it("una ruta privada sin sesión redirige al login", () => {
      renderizarApp("/panel");

      expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
      expect(screen.queryByRole("complementary", { name: "Menú lateral" })).toBeNull();
    });

    it("con sesión, la página privada se muestra dentro del marco", async () => {
      iniciarSesionSimulada(USUARIOS.analista);
      simularGet({
        "/dashboard": { totalCandidatos: 3, solicitudesPendientes: 1, solicitudesEnProceso: 1, solicitudesFinalizadas: 1 },
      });

      renderizarApp("/");

      expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
      expect(within(screen.getByRole("main")).getByRole("heading", { name: "Dashboard" })).toBeTruthy();
      expect(menuLateral()).toBeTruthy();
      expect(screen.getByRole("contentinfo")).toBeTruthy();
    });

    it("el evaluador que entra a Nueva solicitud vuelve al inicio (el permiso por rol se mantiene)", async () => {
      iniciarSesionSimulada(USUARIOS.evaluador);
      simularGet({
        "/dashboard": { totalCandidatos: 0, solicitudesPendientes: 0, solicitudesEnProceso: 0, solicitudesFinalizadas: 0 },
      });

      renderizarApp("/solicitudes/nueva");

      expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
    });

    it("la postulación pública se muestra sin el marco de la zona privada", async () => {
      simularGet({ "/postulaciones/familias": [] });

      renderizarApp("/postular");

      expect(screen.queryByRole("complementary", { name: "Menú lateral" })).toBeNull();
      expect(screen.queryByRole("contentinfo")).toBeNull();
      expect(await screen.findByLabelText("Nombre completo")).toBeTruthy();
    });
  });
});
