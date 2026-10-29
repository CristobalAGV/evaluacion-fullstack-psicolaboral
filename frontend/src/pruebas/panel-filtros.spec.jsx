// Panel: búsqueda, filtros (en el cliente, sobre los datos ya cargados) y modal de editar.
import { screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import Panel from "../pages/Panel";
import { renderizar, iniciarSesionSimulada, limpiarSesion, simularGet, USUARIOS } from "./ayudantes";

const EVA = { _id: "u-eva", nombre: "Eva Evaluadora" };
const OTTO = { _id: "u-otto", nombre: "Otto Evaluador" };

function solicitud({ id, nombre, cargo, area, estado = "Pendiente", responsable = null, origen = "analista" }) {
  return {
    _id: id,
    estado,
    cargo,
    candidato: { nombre, origen },
    familiaDeCargo: { nombre: area },
    profesionalResponsable: responsable,
  };
}

const DATOS = [
  solicitud({ id: "a", nombre: "Álvaro Pérez", cargo: "Contador", area: "Finanzas", responsable: EVA, origen: "postulacion_publica" }),
  solicitud({ id: "b", nombre: "Beatriz Soto", cargo: "Ejecutiva de ventas", area: "Ventas", responsable: EVA }),
  solicitud({ id: "c", nombre: "Carlos Díaz", cargo: "Vendedor", area: "Ventas", estado: "En proceso", responsable: OTTO }),
  solicitud({ id: "d", nombre: "Daniela Rojas", cargo: "Analista de datos", area: "Finanzas", estado: "Finalizada", origen: "postulacion_publica" }),
];

const tarjeta = (nombre) => screen.getByRole("link", { name: nombre }).closest("div.shadow-sm");
// El título de cada columna lleva su cantidad: "Pendiente (2)".
const columna = (titulo) => screen.getByRole("heading", { name: new RegExp(`^${titulo} \\(`) }).parentElement;

describe("Panel: búsqueda y filtros", () => {
  afterEach(() => limpiarSesion());

  async function abrir(usuario = USUARIOS.analista) {
    iniciarSesionSimulada(usuario);
    vi.spyOn(api, "get").mockResolvedValue({ data: DATOS });
    renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });
    await screen.findByText("Panel de solicitudes");
  }

  const visible = (nombre) => screen.queryByRole("link", { name: nombre }) !== null;
  const nombresVisibles = () => DATOS.filter((s) => visible(s.candidato.nombre)).map((s) => s.candidato.nombre);
  const escribirBusqueda = (texto) => fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: texto } });
  const elegir = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  const botonLimpiar = () => screen.queryByRole("button", { name: "Limpiar filtros" });

  it("sin filtros muestra todas las solicitudes y el resumen completo", async () => {
    await abrir();

    expect(nombresVisibles()).toEqual(["Álvaro Pérez", "Beatriz Soto", "Carlos Díaz", "Daniela Rojas"]);
    expect(screen.getByText("Mostrando 4 de 4 solicitudes")).toBeTruthy();
    expect(screen.queryByText("Ninguna solicitud coincide con los filtros")).toBeNull();
  });

  it("busca por nombre del candidato", async () => {
    await abrir();

    escribirBusqueda("beatriz");

    expect(nombresVisibles()).toEqual(["Beatriz Soto"]);
  });

  it("busca por cargo", async () => {
    await abrir();

    escribirBusqueda("vendedor");

    expect(nombresVisibles()).toEqual(["Carlos Díaz"]);
  });

  it("ignora mayúsculas y tildes, hacia los dos lados", async () => {
    await abrir();

    escribirBusqueda("ALVARO PEREZ");
    expect(nombresVisibles()).toEqual(["Álvaro Pérez"]);

    escribirBusqueda("díaz");
    expect(nombresVisibles()).toEqual(["Carlos Díaz"]);

    escribirBusqueda("CONTÁDOR");
    expect(nombresVisibles()).toEqual(["Álvaro Pérez"]);
  });

  it("filtra por área, con las áreas que existen en los datos", async () => {
    await abrir();
    const opciones = within(screen.getByLabelText("Área")).getAllByRole("option").map((o) => o.textContent);
    expect(opciones).toEqual(["Todas", "Finanzas", "Ventas"]);

    elegir("Área", "Finanzas");

    expect(nombresVisibles()).toEqual(["Álvaro Pérez", "Daniela Rojas"]);
  });

  it("filtra por responsable", async () => {
    await abrir();
    const opciones = within(screen.getByLabelText("Responsable")).getAllByRole("option").map((o) => o.textContent);
    expect(opciones).toEqual(["Todos", "Eva Evaluadora", "Otto Evaluador"]);

    elegir("Responsable", "Otto Evaluador");

    expect(nombresVisibles()).toEqual(["Carlos Díaz"]);
  });

  it("filtra por origen: postulación pública o creadas por el analista", async () => {
    await abrir();

    elegir("Origen", "publica");
    expect(nombresVisibles()).toEqual(["Álvaro Pérez", "Daniela Rojas"]);

    elegir("Origen", "analista");
    expect(nombresVisibles()).toEqual(["Beatriz Soto", "Carlos Díaz"]);

    elegir("Origen", "todas");
    expect(nombresVisibles().length).toBe(4);
  });

  it("combina filtros: solo quedan las solicitudes que cumplen todos", async () => {
    await abrir();

    elegir("Área", "Ventas");
    expect(nombresVisibles()).toEqual(["Beatriz Soto", "Carlos Díaz"]);
    elegir("Responsable", "Eva Evaluadora");
    expect(nombresVisibles()).toEqual(["Beatriz Soto"]);
    escribirBusqueda("contador");
    expect(nombresVisibles()).toEqual([]);
  });

  it('"Limpiar filtros" aparece solo con filtros activos y lo restablece todo', async () => {
    await abrir();
    expect(botonLimpiar()).toBeNull();

    escribirBusqueda("soto");
    elegir("Área", "Ventas");
    elegir("Origen", "analista");
    expect(botonLimpiar()).not.toBeNull();

    fireEvent.click(botonLimpiar());

    expect(botonLimpiar()).toBeNull();
    expect(screen.getByLabelText("Buscar").value).toBe("");
    expect(screen.getByLabelText("Área").value).toBe("");
    expect(screen.getByLabelText("Responsable").value).toBe("");
    expect(screen.getByLabelText("Origen").value).toBe("todas");
    expect(nombresVisibles().length).toBe(4);
  });

  it("un texto de búsqueda con solo espacios no cuenta como filtro", async () => {
    await abrir();

    escribirBusqueda("   ");

    expect(botonLimpiar()).toBeNull();
    expect(nombresVisibles().length).toBe(4);
  });

  it("cada columna muestra su cantidad, calculada sobre lo filtrado", async () => {
    await abrir();
    expect(screen.getByRole("heading", { name: "Pendiente (2)" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "En proceso (1)" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Finalizada (1)" })).toBeTruthy();

    elegir("Área", "Finanzas");

    expect(screen.getByRole("heading", { name: "Pendiente (1)" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "En proceso (0)" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Finalizada (1)" })).toBeTruthy();
  });

  it('una columna que queda vacía por el filtro muestra "Sin solicitudes"', async () => {
    await abrir();
    expect(within(columna("En proceso")).queryByText("Sin solicitudes")).toBeNull();

    elegir("Área", "Finanzas");

    expect(within(columna("En proceso")).getByText("Sin solicitudes")).toBeTruthy();
    expect(within(columna("Pendiente")).queryByText("Sin solicitudes")).toBeNull();
  });

  it("el resumen cuenta lo visible sobre el total", async () => {
    await abrir();

    elegir("Origen", "publica");

    expect(screen.getByText("Mostrando 2 de 4 solicitudes")).toBeTruthy();
  });

  it("si ninguna solicitud coincide muestra una alerta informativa y las columnas vacías", async () => {
    await abrir();

    escribirBusqueda("zzz");

    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toBe("Ninguna solicitud coincide con los filtros");
    expect(alerta.classList.contains("alert-info")).toBe(true);
    expect(screen.getByText("Mostrando 0 de 4 solicitudes")).toBeTruthy();
    expect(screen.getAllByText("Sin solicitudes").length).toBe(3);
  });

  it("filtrar no cambia a las solicitudes de columna", async () => {
    await abrir();

    escribirBusqueda("beatriz");
    expect(within(columna("Pendiente")).getByText("Beatriz Soto")).toBeTruthy();

    fireEvent.click(botonLimpiar());
    expect(within(columna("Pendiente")).getByText("Beatriz Soto")).toBeTruthy();
    expect(within(columna("Pendiente")).getByText("Álvaro Pérez")).toBeTruthy();
    expect(within(columna("En proceso")).getByText("Carlos Díaz")).toBeTruthy();
    expect(within(columna("Finalizada")).getByText("Daniela Rojas")).toBeTruthy();
  });

  it("mover una solicitud con un filtro activo funciona y la tarjeta sigue visible en su nueva columna", async () => {
    await abrir();
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: { ...DATOS[1], estado: "En proceso" } });
    elegir("Área", "Ventas");

    fireEvent.click(within(tarjeta("Beatriz Soto")).getByRole("button", { name: "Mover a En proceso" }));

    expect(await within(columna("En proceso")).findByText("Beatriz Soto")).toBeTruthy();
    expect(patch).toHaveBeenCalledExactlyOnceWith("/solicitudes/b/estado", { estado: "En proceso" });
    expect(screen.getByRole("heading", { name: "Pendiente (0)" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "En proceso (2)" })).toBeTruthy();
    expect(screen.getByText("Mostrando 2 de 4 solicitudes")).toBeTruthy();
    expect(screen.getByLabelText("Área").value).toBe("Ventas");
  });

  it("el evaluador también puede buscar y filtrar, aunque no tenga botones de gestión", async () => {
    await abrir(USUARIOS.evaluador);

    escribirBusqueda("carlos");

    expect(nombresVisibles()).toEqual(["Carlos Díaz"]);
    expect(screen.queryByRole("button", { name: "Mover a En proceso" })).toBeNull();
  });

  it("usa una grilla responsiva de tres columnas que se apilan en móvil", async () => {
    await abrir();

    const columnas = [...document.querySelectorAll(".row.g-3 > div")];

    expect(columnas.length).toBe(3);
    for (const col of columnas) expect([...col.classList]).toEqual(["col-12", "col-lg-4"]);
  });
});

describe("Panel: modal de editar", () => {
  afterEach(() => limpiarSesion());

  async function abrirModal() {
    iniciarSesionSimulada(USUARIOS.analista);
    simularGet({ "/solicitudes": DATOS, "/familias": [], "/usuarios": [EVA] });
    renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });
    await screen.findByText("Panel de solicitudes");
    fireEvent.click(within(tarjeta("Beatriz Soto")).getByRole("button", { name: "Editar" }));
    await screen.findByRole("heading", { name: "Editar solicitud" });
  }

  const dialogo = () => screen.queryByRole("dialog", { name: "Editar solicitud" });

  it("abre con el marcado de modal grande de Bootstrap, desplazable y con fondo", async () => {
    await abrirModal();

    expect(dialogo().classList.contains("d-block")).toBe(true);
    expect(dialogo().getAttribute("aria-modal")).toBe("true");
    const caja = dialogo().querySelector(".modal-dialog");
    expect(caja.classList.contains("modal-lg")).toBe(true);
    expect(caja.classList.contains("modal-dialog-scrollable")).toBe(true);
    expect(dialogo().querySelector(".modal-content > .modal-header")).not.toBeNull();
    expect(dialogo().querySelector(".modal-content > .modal-body")).not.toBeNull();
    expect(document.querySelector(".modal-backdrop.show")).not.toBeNull();
    expect(document.body.classList.contains("modal-open")).toBe(true);
  });

  it("se cierra con la tecla Escape", async () => {
    await abrirModal();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(dialogo()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(document.body.classList.contains("modal-open")).toBe(false);
  });

  it("se cierra al hacer clic en el fondo, pero no al hacer clic dentro del cuadro", async () => {
    await abrirModal();

    fireEvent.click(screen.getByLabelText("Nombre del candidato"));
    fireEvent.click(dialogo().querySelector(".modal-content"));
    expect(dialogo()).not.toBeNull();

    fireEvent.click(dialogo());
    expect(dialogo()).toBeNull();
  });

  it("se cierra con el botón de la cabecera y con Cancelar", async () => {
    await abrirModal();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(dialogo()).toBeNull();

    fireEvent.click(within(tarjeta("Beatriz Soto")).getByRole("button", { name: "Editar" }));
    await screen.findByRole("heading", { name: "Editar solicitud" });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(dialogo()).toBeNull();
  });
});
