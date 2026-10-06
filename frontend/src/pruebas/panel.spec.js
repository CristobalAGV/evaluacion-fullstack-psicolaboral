// Panel Kanban. GET /solicitudes y PATCH /solicitudes/:id/estado se reemplazan con spies.
import { screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import Panel from "../pages/Panel";
import { renderizar, iniciarSesionSimulada, limpiarSesion, USUARIOS } from "./ayudantes";

const EVALUADORA = { _id: "u-evaluador", nombre: "Eva Evaluadora" };

function solicitud({ id, nombre, estado = "Pendiente", responsable = null, origen = "analista" }) {
  return {
    _id: id,
    estado,
    cargo: "Ejecutivo de ventas",
    candidato: { nombre, origen },
    familiaDeCargo: { nombre: "Ventas" },
    profesionalResponsable: responsable,
  };
}

const SOLICITUDES = [
  solicitud({ id: "s1", nombre: "Sin Evaluador", origen: "postulacion_publica" }),
  solicitud({ id: "s2", nombre: "Con Evaluador", responsable: EVALUADORA }),
  solicitud({ id: "s3", nombre: "En Curso", estado: "En proceso", responsable: EVALUADORA }),
];

describe("Panel (Kanban)", () => {
  afterEach(() => limpiarSesion());

  async function abrirPanel(usuario, solicitudes = SOLICITUDES) {
    iniciarSesionSimulada(usuario);
    spyOn(api, "get").and.resolveTo({ data: solicitudes });
    renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });
    await screen.findByText("Panel de solicitudes");
  }
  const tarjeta = (nombre) => screen.getByRole("link", { name: nombre }).closest("div.shadow-sm");
  const columna = (titulo) => screen.getByRole("heading", { name: titulo }).parentElement;

  it("muestra las tres columnas y reparte las solicitudes por estado", async () => {
    await abrirPanel(USUARIOS.analista);

    expect(within(columna("Pendiente")).getByText("Sin Evaluador")).toBeTruthy();
    expect(within(columna("Pendiente")).getByText("Con Evaluador")).toBeTruthy();
    expect(within(columna("En proceso")).getByText("En Curso")).toBeTruthy();
    expect(within(columna("Finalizada")).getByText("Sin solicitudes")).toBeTruthy();
  });

  it('sin evaluador muestra "Asignar evaluador" en vez de "Mover a En proceso"', async () => {
    await abrirPanel(USUARIOS.analista);

    const sinEvaluador = within(tarjeta("Sin Evaluador"));
    expect(sinEvaluador.getByRole("button", { name: "Asignar evaluador" })).toBeTruthy();
    expect(sinEvaluador.queryByRole("button", { name: "Mover a En proceso" })).toBeNull();
    expect(sinEvaluador.getByText("Sin evaluador asignado")).toBeTruthy();
    expect(sinEvaluador.getByText("Postulación pública")).toBeTruthy();
  });

  it('con evaluador permite "Mover a En proceso" y llama a la API con el nuevo estado', async () => {
    // Arrange
    await abrirPanel(USUARIOS.analista);
    const patch = spyOn(api, "patch").and.resolveTo({
      data: { ...SOLICITUDES[1], estado: "En proceso" },
    });

    // Act
    fireEvent.click(within(tarjeta("Con Evaluador")).getByRole("button", { name: "Mover a En proceso" }));

    // Assert
    expect(await within(columna("En proceso")).findByText("Con Evaluador")).toBeTruthy();
    expect(patch).toHaveBeenCalledOnceWith("/solicitudes/s2/estado", { estado: "En proceso" });
  });

  it('"Eliminar" solo aparece para el admin', async () => {
    await abrirPanel(USUARIOS.analista);
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it('el admin sí ve "Eliminar"', async () => {
    await abrirPanel(USUARIOS.admin);
    expect(screen.getAllByRole("button", { name: "Eliminar" }).length).toBe(3);
  });

  it("el evaluador ve el tablero pero sin botones de gestión", async () => {
    await abrirPanel(USUARIOS.evaluador);

    expect(screen.queryAllByRole("button").length).toBe(0);
    expect(screen.queryByRole("link", { name: "+ Nueva solicitud" })).toBeNull();
  });
});
