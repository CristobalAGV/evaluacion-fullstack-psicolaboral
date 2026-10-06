// Panel Kanban. GET /solicitudes y PATCH /solicitudes/:id/estado se reemplazan con spies.
import { screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import Panel from "../pages/Panel";
import { renderizar, iniciarSesionSimulada, limpiarSesion, simularGet, errorAxios, esperarQue, USUARIOS } from "./ayudantes";

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

  it('en "En proceso" ofrece "Marcar finalizada"', async () => {
    await abrirPanel(USUARIOS.analista);

    expect(within(tarjeta("En Curso")).getByRole("button", { name: "Marcar finalizada" })).toBeTruthy();
  });

  it("si el backend rechaza el cambio de estado, muestra el error y la tarjeta no se mueve", async () => {
    await abrirPanel(USUARIOS.analista);
    spyOn(api, "patch").and.rejectWith(errorAxios(400, 'Asigna un evaluador a esta solicitud antes de moverla a "En proceso".'));

    fireEvent.click(within(tarjeta("Con Evaluador")).getByRole("button", { name: "Mover a En proceso" }));

    expect(await screen.findByText('Asigna un evaluador a esta solicitud antes de moverla a "En proceso".')).toBeTruthy();
    expect(within(columna("Pendiente")).getByText("Con Evaluador")).toBeTruthy();
  });

  it("muestra el error si no se pueden cargar las solicitudes", async () => {
    iniciarSesionSimulada(USUARIOS.analista);
    spyOn(api, "get").and.rejectWith(errorAxios(500, "Error al listar solicitudes"));

    renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });

    expect(await screen.findByText("Error al listar solicitudes")).toBeTruthy();
    expect(within(columna("Pendiente")).getByText("Sin solicitudes")).toBeTruthy();
  });

  it('muestra "Cargando panel..." mientras espera la respuesta', () => {
    iniciarSesionSimulada(USUARIOS.analista);
    spyOn(api, "get").and.returnValue(new Promise(() => {}));

    renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });

    expect(screen.getByText("Cargando panel...")).toBeTruthy();
  });

  describe("eliminar (admin)", () => {
    it("pide confirmación, llama a DELETE y quita la tarjeta", async () => {
      // Arrange
      await abrirPanel(USUARIOS.admin);
      const confirmar = spyOn(window, "confirm").and.returnValue(true);
      const borrar = spyOn(api, "delete").and.resolveTo({ data: { mensaje: "Solicitud eliminada" } });

      // Act
      fireEvent.click(within(tarjeta("Con Evaluador")).getByRole("button", { name: "Eliminar" }));

      // Assert
      await esperarQue(() => screen.queryByText("Con Evaluador") === null, "que desaparezca la tarjeta");
      expect(confirmar).toHaveBeenCalledOnceWith(
        "¿Eliminar la solicitud de Con Evaluador (Ejecutivo de ventas)? Esta acción no se puede deshacer."
      );
      expect(borrar).toHaveBeenCalledOnceWith("/solicitudes/s2");
    });

    it("si no confirma, no borra nada", async () => {
      await abrirPanel(USUARIOS.admin);
      spyOn(window, "confirm").and.returnValue(false);
      const borrar = spyOn(api, "delete");

      fireEvent.click(within(tarjeta("Con Evaluador")).getByRole("button", { name: "Eliminar" }));

      expect(borrar).not.toHaveBeenCalled();
      expect(screen.getByText("Con Evaluador")).toBeTruthy();
    });

    it("si el backend falla, muestra el error y conserva la tarjeta", async () => {
      await abrirPanel(USUARIOS.admin);
      spyOn(window, "confirm").and.returnValue(true);
      spyOn(api, "delete").and.rejectWith(errorAxios(500, "Error al eliminar la solicitud"));

      fireEvent.click(within(tarjeta("Con Evaluador")).getByRole("button", { name: "Eliminar" }));

      expect(await screen.findByText("Error al eliminar la solicitud")).toBeTruthy();
      expect(screen.getByText("Con Evaluador")).toBeTruthy();
    });
  });

  describe("asignar evaluador desde la tarjeta", () => {
    it("abre el formulario, guarda y la tarjeta pasa a mostrar al responsable", async () => {
      // Arrange
      iniciarSesionSimulada(USUARIOS.analista);
      simularGet({
        "/solicitudes": SOLICITUDES,
        "/familias": [{ _id: "fam-ventas", nombre: "Ventas" }],
        "/usuarios": [EVALUADORA],
      });
      renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });
      await screen.findByText("Panel de solicitudes");
      const asignada = { ...SOLICITUDES[0], profesionalResponsable: EVALUADORA };
      spyOn(api, "put").and.resolveTo({ data: asignada });
      fireEvent.click(within(tarjeta("Sin Evaluador")).getByRole("button", { name: "Asignar evaluador" }));
      await screen.findByRole("heading", { name: "Editar solicitud" });

      // Act
      fireEvent.change(screen.getByLabelText("Nombre del candidato"), { target: { value: "Sin Evaluador" } });
      fireEvent.change(screen.getByLabelText("Correo del candidato"), { target: { value: "sin@ejemplo.cl" } });
      fireEvent.change(screen.getByLabelText("Teléfono del candidato"), { target: { value: "+56 9 1111 2222" } });
      fireEvent.change(screen.getByLabelText("Familia de cargo"), { target: { value: "fam-ventas" } });
      fireEvent.change(screen.getByLabelText("Profesional responsable (evaluador)"), { target: { value: EVALUADORA._id } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      // Assert
      await esperarQue(() => screen.queryByRole("heading", { name: "Editar solicitud" }) === null, "que se cierre el modal");
      const actualizada = within(tarjeta("Sin Evaluador"));
      expect(actualizada.getByText("Responsable: Eva Evaluadora")).toBeTruthy();
      expect(actualizada.getByRole("button", { name: "Mover a En proceso" })).toBeTruthy();
    });

    it("cancelar cierra el formulario sin cambios", async () => {
      iniciarSesionSimulada(USUARIOS.analista);
      simularGet({ "/solicitudes": SOLICITUDES, "/familias": [], "/usuarios": [EVALUADORA] });
      renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });
      await screen.findByText("Panel de solicitudes");
      fireEvent.click(within(tarjeta("Con Evaluador")).getByRole("button", { name: "Editar" }));
      await screen.findByRole("heading", { name: "Editar solicitud" });

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("heading", { name: "Editar solicitud" })).toBeNull();
    });
  });
});
