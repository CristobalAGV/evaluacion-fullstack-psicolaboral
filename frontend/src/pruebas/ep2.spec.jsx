import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import App from "../App";
import Modal from "../components/Modal";
import CampoArchivo from "../components/CampoArchivo";
import SolicitudDetalle from "../pages/SolicitudDetalle";
import { renderizar, iniciarSesionSimulada, limpiarSesion, USUARIOS, simularGet } from "./ayudantes";

afterEach(() => { limpiarSesion(); vi.unstubAllEnvs(); });

it.each([undefined, "false", "TRUE", "1", "true"])("solo true habilita IA: %s", async (valor) => {
  vi.stubEnv("VITE_IA_HABILITADA", valor);
  vi.resetModules();
  const { IA_HABILITADA } = await import("../config/funcionalidades");
  expect(IA_HABILITADA).toBe(valor === "true");
});

it.each(["analista", "evaluador"])("%s no abre registro", async (rol) => {
  iniciarSesionSimulada(USUARIOS[rol]);
  simularGet({ "/dashboard": {} });
  renderizar(<App />, { ruta: "/registro" });
  expect(screen.queryByRole("heading", { name: "Crear usuario" })).toBeNull();
  await screen.findByRole("heading", { name: "Dashboard" });
});

it("sin sesión registro lleva al login público", () => {
  limpiarSesion();
  renderizar(<App />, { ruta: "/registro" });
  expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Registr/ })).toBeNull();
});

it("admin abre el registro interno", () => {
  iniciarSesionSimulada(USUARIOS.admin);
  renderizar(<App />, { ruta: "/registro" });
  expect(screen.getByRole("heading", { name: "Crear usuario" })).toBeTruthy();
});

it("EP2 no monta IA ni consulta sus rutas", async () => {
  iniciarSesionSimulada(USUARIOS.admin);
  const get = simularGet({
    "/solicitudes/s1": { _id: "s1", candidato: { nombre: "Candidata" }, familiaDeCargo: {}, profesionalResponsable: null },
    "/solicitudes/s1/evaluaciones": [],
  });
  renderizar(<SolicitudDetalle />, { ruta: "/solicitudes/s1", rutaDelElemento: "/solicitudes/:id" });
  await screen.findByRole("heading", { name: "Candidata" });
  expect(screen.queryByRole("heading", { name: "Informe psicolaboral" })).toBeNull();
  expect(get.mock.calls.map(([ruta]) => ruta)).toEqual(["/solicitudes/s1", "/solicitudes/s1/evaluaciones"]);
});

it("modal contiene Tab, conserva Escape y devuelve el foco", () => {
  function Ejemplo() {
    const [abierto, setAbierto] = useState(false);
    return <><button onClick={() => setAbierto(true)}>Abrir</button>{abierto && <Modal etiqueta="Ejemplo" onCerrar={() => setAbierto(false)}><button>Último</button></Modal>}</>;
  }
  render(<Ejemplo />);
  const abrir = screen.getByRole("button", { name: "Abrir" });
  abrir.focus(); fireEvent.click(abrir);
  const dialogo = screen.getByRole("dialog", { name: "Ejemplo" });
  expect(document.activeElement).toBe(dialogo);
  fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar" }));
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Último" }));
  fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar" }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(document.activeElement).toBe(abrir);
});

it("archivo asocia ayuda y error con IDs distintos", () => {
  render(<><CampoArchivo etiqueta="CV" error="Error CV" ayuda="Ayuda CV" onChange={() => {}} /><CampoArchivo etiqueta="Otro" onChange={() => {}} /></>);
  const campo = screen.getByLabelText("CV");
  expect(campo.getAttribute("aria-invalid")).toBe("true");
  expect(campo.getAttribute("aria-describedby").split(" ").map((id) => document.getElementById(id).textContent)).toEqual(["Ayuda CV", "Error CV"]);
  expect(campo.id).not.toBe(screen.getByLabelText("Otro").id);
});
