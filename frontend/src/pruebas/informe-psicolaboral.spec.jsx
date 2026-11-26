// InformePsicolaboral: borrador del informe con IA a partir de los apuntes, y la tarjeta de
// evaluación con nota que vive en la misma sección. El backend se reemplaza con spies sobre axios.
import { act, render, screen, fireEvent } from "@testing-library/react";
import api from "../services/api";
import InformePsicolaboral from "../components/InformePsicolaboral";
import { MENSAJE_CUOTA_AGOTADA } from "../utils/mensajeErrorIa";
import { simularGet, errorAxios, esperarQue } from "./ayudantes";

const INFORME_GUARDADO = {
  secciones: [
    { titulo: "Fortalezas", contenido: "Comunicación clara." },
    { titulo: "Conclusión", contenido: "Perfil acorde a lo conversado." },
  ],
  apuntes: "Apuntes guardados",
  instrucciones: "Tono formal",
  modeloIa: "gemini-prueba",
  estado: "borrador",
  generadoPor: { nombre: "Eva Evaluadora" },
  generadoEn: "2026-10-08T15:00:00.000Z",
};

const SIN_INFORME = "Todavía no hay un informe psicolaboral guardado en el sistema.";
const WORD_DISPONIBLE = "El informe de entrevista Word está disponible en el expediente del postulante.";

async function abrir({ informe = null, puedeEditar = true, tieneInforme = true, estadoSolicitud } = {}) {
  const get = simularGet({
    "/solicitudes/s1/informe": informe,
    "/solicitudes/s1/informe/evaluacion": null,
  });
  render(<InformePsicolaboral solicitudId="s1" puedeEditar={puedeEditar} tieneCv
    tieneInforme={tieneInforme} estadoSolicitud={estadoSolicitud} />);
  await esperarQue(() => !screen.queryByText("Cargando informe..."), "que cargue el informe");
  return get;
}

const campoApuntes = () => screen.getByLabelText(/Apuntes de la entrevista/);
const botonBorrador = () => screen.queryByRole("button", { name: /^(Generar borrador|Volver a generar) con IA$/ });

describe("InformePsicolaboral", () => {
  describe("render y permisos", () => {
    it("mientras carga muestra un mensaje", () => {
      vi.spyOn(api, "get").mockReturnValue(new Promise(() => {}));
      render(<InformePsicolaboral solicitudId="s1" puedeEditar tieneCv tieneInforme />);

      expect(screen.getByText("Cargando informe...")).toBeTruthy();
    });

    it("con permiso de edición: aviso de IA, apuntes, indicaciones y botón deshabilitado sin apuntes", async () => {
      await abrir();

      expect(screen.getByText(/Borrador generado por inteligencia artificial/)).toBeTruthy();
      expect(campoApuntes()).toBeTruthy();
      expect(screen.getByLabelText(/Instrucciones adicionales para la IA/)).toBeTruthy();
      expect(botonBorrador().disabled).toBe(true);

      fireEvent.change(campoApuntes(), { target: { value: "Candidata puntual" } });

      expect(botonBorrador().disabled).toBe(false);
    });

    it("incluye la tarjeta de evaluación con nota en la misma sección", async () => {
      const get = await abrir();

      expect(await screen.findByRole("heading", { name: "Evaluación de apoyo con IA" })).toBeTruthy();
      expect(await screen.findByRole("button", { name: "Generar evaluación con IA" })).toBeTruthy();
      expect(get).toHaveBeenCalledWith("/solicitudes/s1/informe/evaluacion");
    });

    it("sin permiso y sin informe: no hay botones de IA y explica quién puede generarlo", async () => {
      await abrir({ puedeEditar: false, tieneInforme: false });

      expect(screen.getByText(SIN_INFORME)).toBeTruthy();
      expect(screen.queryByText(WORD_DISPONIBLE)).toBeNull();
      expect(screen.getByText(/Solo el evaluador responsable puede generarlo/)).toBeTruthy();
      expect(botonBorrador()).toBeNull();
      expect(screen.queryByRole("button", { name: "Generar evaluación con IA" })).toBeNull();
    });

    it("con Word y sin informe psicolaboral guardado indica que el Word está en el expediente", async () => {
      await abrir({ estadoSolicitud: "Finalizada", puedeEditar: false });
      expect(screen.getByText(SIN_INFORME)).toBeTruthy();
      expect(screen.getByText(WORD_DISPONIBLE)).toBeTruthy();
      expect(botonBorrador()).toBeNull();
    });

    it("sin permiso y con informe: lo muestra en solo lectura con el aviso y la autoría", async () => {
      await abrir({ informe: INFORME_GUARDADO, puedeEditar: false });

      expect(screen.getByText("Revisión y responsabilidad profesional")).toBeTruthy();
      expect(screen.getByText("Comunicación clara.")).toBeTruthy();
      expect(screen.queryByText(SIN_INFORME)).toBeNull();
      expect(screen.queryByText(WORD_DISPONIBLE)).toBeNull();
      expect(screen.getByText(/Última edición: Eva Evaluadora/)).toBeTruthy();
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.queryByRole("button", { name: "Guardar informe" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar informe" })).toBeNull();
    });

    it("abre el informe guardado en lectura y precarga el contenido al editar", async () => {
      await abrir({ informe: INFORME_GUARDADO });

      expect(screen.getByText("Guardado")).toBeTruthy();
      expect(screen.getByText("Apuntes guardados")).toBeTruthy();
      expect(screen.getByText("Última edición: Eva Evaluadora")).toBeTruthy();
      expect(screen.getByText("Modelo de IA: gemini-prueba")).toBeTruthy();
      expect(screen.queryByRole("textbox")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Editar informe" }));
      expect(campoApuntes().value).toBe("Apuntes guardados");
      expect(screen.getByLabelText(/Instrucciones adicionales/).value).toBe("Tono formal");
      expect(screen.getByLabelText("Fortalezas").value).toBe("Comunicación clara.");
      expect(botonBorrador().textContent).toBe("Volver a generar con IA");
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    });

    it.each([true, false])("si falla la carga, muestra el error y no la ausencia (edición: %s)", async (puedeEditar) => {
      await abrir({
        informe: puedeEditar ? errorAxios(500, "Error al obtener el informe") : new Error("Network Error"),
        puedeEditar, estadoSolicitud: puedeEditar ? "En proceso" : "Finalizada",
      });
      const mensaje = puedeEditar ? "Error al obtener el informe" : "No se pudo cargar el informe psicolaboral.";
      expect(screen.getByRole("alert").textContent).toBe(mensaje);
      expect(screen.queryByText(SIN_INFORME)).toBeNull();
      expect(screen.queryByText(WORD_DISPONIBLE)).toBeNull();
    });
  });

  describe("generar borrador", () => {
    it("muestra el estado de carga y luego el borrador por secciones", async () => {
      // Arrange
      let responder;
      const post = vi.spyOn(api, "post").mockReturnValue(new Promise((r) => (responder = r)));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Relata manejo de reclamos" } });
      fireEvent.change(screen.getByLabelText(/Instrucciones adicionales/), { target: { value: "Breve" } });

      // Act
      fireEvent.click(botonBorrador());

      // Assert: cargando
      expect(await screen.findByRole("button", { name: "Generando borrador..." })).toBeTruthy();
      expect(screen.getByText(/Redactando el borrador/)).toBeTruthy();
      expect(post).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1/informe/generar", {
        apuntes: "Relata manejo de reclamos",
        instrucciones: "Breve",
      });

      // Act: llega el borrador
      responder({ data: { secciones: [{ titulo: "Fortalezas", contenido: "Maneja reclamos." }], modeloIa: "gemini-prueba" } });

      // Assert
      expect(await screen.findByText("Borrador generado. Revísalo y corrígelo antes de guardar.")).toBeTruthy();
      expect(screen.getByText("Borrador sin guardar")).toBeTruthy();
      expect(screen.queryByText("Guardado")).toBeNull();
      expect(screen.getByLabelText("Fortalezas").value).toBe("Maneja reclamos.");
      expect(screen.getByRole("button", { name: "Guardar informe" })).toBeTruthy();
    });

    it("ante cuota agotada (429) muestra el mensaje amable y conserva los apuntes", async () => {
      vi.spyOn(api, "post").mockRejectedValue(errorAxios(429, "Se agoto la cuota"));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Apuntes importantes" } });

      fireEvent.click(botonBorrador());

      expect(await screen.findByText(MENSAJE_CUOTA_AGOTADA)).toBeTruthy();
      expect(campoApuntes().value).toBe("Apuntes importantes");
    });

    it("ante otros errores muestra el mensaje del servidor", async () => {
      vi.spyOn(api, "post").mockRejectedValue(errorAxios(503, "El servicio de IA no esta configurado."));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Apuntes" } });

      fireEvent.click(botonBorrador());

      expect(await screen.findByText("El servicio de IA no esta configurado.")).toBeTruthy();
    });

    it("envía los apuntes escritos a la evaluación con nota", async () => {
      const post = vi.spyOn(api, "post").mockReturnValue(new Promise(() => {}));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Apuntes compartidos" } });
      await screen.findByRole("button", { name: "Generar evaluación con IA" });

      fireEvent.click(screen.getByRole("button", { name: "Generar evaluación con IA" }));

      expect(post).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1/informe/evaluacion/generar", { apuntes: "Apuntes compartidos" });
    });
  });

  describe("confirmar y guardar", () => {
    it("solo marca el primer borrador como guardado tras la respuesta y evita un segundo envío", async () => {
      let confirmar;
      const put = vi.spyOn(api, "put").mockReturnValue(new Promise((resolver) => { confirmar = resolver; }));
      vi.spyOn(api, "post").mockResolvedValueOnce({ data: INFORME_GUARDADO });
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Apuntes ficticios" } });
      fireEvent.click(botonBorrador());
      const guardar = await screen.findByRole("button", { name: "Guardar informe" });
      expect(put).not.toHaveBeenCalled();
      fireEvent.click(guardar);
      fireEvent.click(guardar);
      expect(put).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Guardado")).toBeNull();
      expect(screen.getByRole("button", { name: "Guardando..." }).disabled).toBe(true);
      await act(async () => confirmar({ data: INFORME_GUARDADO }));
      expect(screen.getByText("Guardado")).toBeTruthy();
      expect(screen.getByText("Informe guardado.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Editar informe" })).toBeTruthy();
    });

    it("guarda las secciones editadas por el evaluador", async () => {
      // Arrange
      const put = vi.spyOn(api, "put").mockResolvedValue({
        data: { ...INFORME_GUARDADO, secciones: [{ titulo: "Fortalezas", contenido: "Editado" }] },
      });
      await abrir({ informe: INFORME_GUARDADO });
      fireEvent.click(screen.getByRole("button", { name: "Editar informe" }));

      // Act
      fireEvent.change(screen.getByLabelText("Fortalezas"), { target: { value: "Editado" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      // Assert
      expect(await screen.findByText("Informe guardado.")).toBeTruthy();
      expect(screen.getByText("Editado")).toBeTruthy();
      expect(screen.queryByRole("textbox")).toBeNull();
      const [ruta, cuerpo] = put.mock.lastCall;
      expect(ruta).toBe("/solicitudes/s1/informe");
      expect(cuerpo.secciones[0]).toEqual({ titulo: "Fortalezas", contenido: "Editado" });
      expect(cuerpo.apuntes).toBe("Apuntes guardados");
      expect(cuerpo.estado).toBe("borrador");
    });

    it("si el guardado falla, muestra el error", async () => {
      vi.spyOn(api, "put").mockRejectedValue(errorAxios(403, "Solo el evaluador responsable de la solicitud (o un admin) puede generar o editar su informe."));
      await abrir({ informe: INFORME_GUARDADO });
      fireEvent.click(screen.getByRole("button", { name: "Editar informe" }));
      fireEvent.change(screen.getByLabelText("Fortalezas"), { target: { value: "Corrección no guardada" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText(/Solo el evaluador responsable de la solicitud/)).toBeTruthy();
      expect(screen.getByLabelText("Fortalezas").value).toBe("Corrección no guardada");
      expect(screen.queryByText("Guardado")).toBeNull();
    });

    it("cancela la edición y sus errores sin perder el informe ni reiniciar la evaluación IA", async () => {
      vi.spyOn(api, "post").mockRejectedValue(errorAxios(503, "Proveedor no disponible"));
      const get = await abrir({ informe: INFORME_GUARDADO });
      fireEvent.click(screen.getByRole("button", { name: "Editar informe" }));
      fireEvent.change(campoApuntes(), { target: { value: "Notas nuevas" } });
      fireEvent.change(screen.getByLabelText("Fortalezas"), { target: { value: "Texto local" } });
      fireEvent.click(botonBorrador());
      expect(await screen.findByText("Proveedor no disponible")).toBeTruthy();
      expect(screen.getByLabelText("Fortalezas").value).toBe("Texto local");
      expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "Cancelar edición" }));
      expect(screen.getByText("Comunicación clara.")).toBeTruthy();
      expect(screen.getByText("Apuntes guardados")).toBeTruthy();
      expect(screen.queryByText("Proveedor no disponible")).toBeNull();
      expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(true);
      expect(get.mock.calls.filter(([ruta]) => ruta.endsWith("/evaluacion"))).toHaveLength(1);
    });

    it("mantiene lectura en Finalizada incluso cuando recibe permiso de edición", async () => {
      await abrir({ informe: INFORME_GUARDADO, estadoSolicitud: "Finalizada" });
      expect(screen.getByText("Guardado")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Editar informe" })).toBeNull();
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(botonBorrador()).toBeNull();
    });

    it("ignora una respuesta de carga de otra solicitud que llega tarde", async () => {
      let resolver;
      vi.spyOn(api, "get").mockImplementation((ruta) => ruta === "/solicitudes/s1/informe"
        ? new Promise((respuesta) => { resolver = respuesta; })
        : Promise.resolve({ data: null }));
      const vista = render(<InformePsicolaboral solicitudId="s1" puedeEditar />);
      vista.rerender(<InformePsicolaboral solicitudId="s2" puedeEditar />);
      await screen.findByText(SIN_INFORME);
      await act(async () => resolver({ data: INFORME_GUARDADO }));
      expect(screen.queryByText("Comunicación clara.")).toBeNull();
      expect(screen.getByText(SIN_INFORME)).toBeTruthy();
    });
  });
});
