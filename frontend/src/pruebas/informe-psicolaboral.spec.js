// InformePsicolaboral: borrador del informe con IA a partir de los apuntes, y la tarjeta de
// evaluación con nota que vive en la misma sección. El backend se reemplaza con spies sobre axios.
import { render, screen, fireEvent } from "@testing-library/react";
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

async function abrir({ informe = null, puedeEditar = true } = {}) {
  const get = simularGet({
    "/solicitudes/s1/informe": informe,
    "/solicitudes/s1/informe/evaluacion": null,
  });
  render(<InformePsicolaboral solicitudId="s1" puedeEditar={puedeEditar} tieneCv tieneInforme />);
  await esperarQue(() => !screen.queryByText("Cargando informe..."), "que cargue el informe");
  return get;
}

const campoApuntes = () => screen.getByLabelText(/Apuntes de la entrevista/);
const botonBorrador = () => screen.queryByRole("button", { name: /^(Generar borrador|Volver a generar) con IA$/ });

describe("InformePsicolaboral", () => {
  describe("render y permisos", () => {
    it("mientras carga muestra un mensaje", () => {
      spyOn(api, "get").and.returnValue(new Promise(() => {}));
      render(<InformePsicolaboral solicitudId="s1" puedeEditar tieneCv tieneInforme />);

      expect(screen.getByText("Cargando informe...")).toBeTruthy();
    });

    it("con permiso de edición: aviso de IA, apuntes, indicaciones y botón deshabilitado sin apuntes", async () => {
      await abrir();

      expect(screen.getByText(/Borrador generado por inteligencia artificial/)).toBeTruthy();
      expect(campoApuntes()).toBeTruthy();
      expect(screen.getByLabelText(/Instrucciones adicionales para la IA/)).toBeTruthy();
      expect(botonBorrador().disabled).toBeTrue();

      fireEvent.change(campoApuntes(), { target: { value: "Candidata puntual" } });

      expect(botonBorrador().disabled).toBeFalse();
    });

    it("incluye la tarjeta de evaluación con nota en la misma sección", async () => {
      const get = await abrir();

      expect(await screen.findByRole("heading", { name: "Evaluación de apoyo con IA" })).toBeTruthy();
      expect(await screen.findByRole("button", { name: "Generar evaluación con IA" })).toBeTruthy();
      expect(get).toHaveBeenCalledWith("/solicitudes/s1/informe/evaluacion");
    });

    it("sin permiso y sin informe: no hay botones de IA y explica quién puede generarlo", async () => {
      await abrir({ puedeEditar: false });

      expect(screen.getByText(/Solo el evaluador responsable puede generarlo/)).toBeTruthy();
      expect(botonBorrador()).toBeNull();
      expect(screen.queryByRole("button", { name: "Generar evaluación con IA" })).toBeNull();
    });

    it("sin permiso y con informe: lo muestra en solo lectura con el aviso y la autoría", async () => {
      await abrir({ informe: INFORME_GUARDADO, puedeEditar: false });

      expect(screen.getByText(/Borrador generado por inteligencia artificial/)).toBeTruthy();
      expect(screen.getByText("Comunicación clara.")).toBeTruthy();
      expect(screen.getByText(/Última edición: Eva Evaluadora/)).toBeTruthy();
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.queryByRole("button", { name: "Guardar informe" })).toBeNull();
    });

    it("con informe guardado y permiso: carga apuntes, indicaciones y secciones editables", async () => {
      await abrir({ informe: INFORME_GUARDADO });

      expect(campoApuntes().value).toBe("Apuntes guardados");
      expect(screen.getByLabelText(/Instrucciones adicionales/).value).toBe("Tono formal");
      expect(screen.getByLabelText("Fortalezas").value).toBe("Comunicación clara.");
      expect(botonBorrador().textContent).toBe("Volver a generar con IA");
      expect(screen.getByText(/Última edición guardada: Eva Evaluadora/)).toBeTruthy();
    });

    it("si falla la carga del informe, muestra el error", async () => {
      simularGet({
        "/solicitudes/s1/informe": errorAxios(500, "Error al obtener el informe"),
        "/solicitudes/s1/informe/evaluacion": null,
      });
      render(<InformePsicolaboral solicitudId="s1" puedeEditar tieneCv tieneInforme />);

      expect(await screen.findByText("Error al obtener el informe")).toBeTruthy();
    });
  });

  describe("generar borrador", () => {
    it("muestra el estado de carga y luego el borrador por secciones", async () => {
      // Arrange
      let responder;
      const post = spyOn(api, "post").and.returnValue(new Promise((r) => (responder = r)));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Relata manejo de reclamos" } });
      fireEvent.change(screen.getByLabelText(/Instrucciones adicionales/), { target: { value: "Breve" } });

      // Act
      fireEvent.click(botonBorrador());

      // Assert: cargando
      expect(await screen.findByRole("button", { name: "Generando borrador..." })).toBeTruthy();
      expect(screen.getByText(/Redactando el borrador/)).toBeTruthy();
      expect(post).toHaveBeenCalledOnceWith("/solicitudes/s1/informe/generar", {
        apuntes: "Relata manejo de reclamos",
        instrucciones: "Breve",
      });

      // Act: llega el borrador
      responder({ data: { secciones: [{ titulo: "Fortalezas", contenido: "Maneja reclamos." }], modeloIa: "gemini-prueba" } });

      // Assert
      expect(await screen.findByText("Borrador generado. Revísalo y corrígelo antes de guardar.")).toBeTruthy();
      expect(screen.getByLabelText("Fortalezas").value).toBe("Maneja reclamos.");
      expect(screen.getByRole("button", { name: "Guardar informe" })).toBeTruthy();
    });

    it("ante cuota agotada (429) muestra el mensaje amable y conserva los apuntes", async () => {
      spyOn(api, "post").and.rejectWith(errorAxios(429, "Se agoto la cuota"));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Apuntes importantes" } });

      fireEvent.click(botonBorrador());

      expect(await screen.findByText(MENSAJE_CUOTA_AGOTADA)).toBeTruthy();
      expect(campoApuntes().value).toBe("Apuntes importantes");
    });

    it("ante otros errores muestra el mensaje del servidor", async () => {
      spyOn(api, "post").and.rejectWith(errorAxios(503, "El servicio de IA no esta configurado."));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Apuntes" } });

      fireEvent.click(botonBorrador());

      expect(await screen.findByText("El servicio de IA no esta configurado.")).toBeTruthy();
    });

    it("envía los apuntes escritos a la evaluación con nota", async () => {
      const post = spyOn(api, "post").and.returnValue(new Promise(() => {}));
      await abrir();
      fireEvent.change(campoApuntes(), { target: { value: "Apuntes compartidos" } });
      await screen.findByRole("button", { name: "Generar evaluación con IA" });

      fireEvent.click(screen.getByRole("button", { name: "Generar evaluación con IA" }));

      expect(post).toHaveBeenCalledOnceWith("/solicitudes/s1/informe/evaluacion/generar", { apuntes: "Apuntes compartidos" });
    });
  });

  describe("confirmar y guardar", () => {
    it("guarda las secciones editadas por el evaluador", async () => {
      // Arrange
      const put = spyOn(api, "put").and.resolveTo({
        data: { ...INFORME_GUARDADO, secciones: [{ titulo: "Fortalezas", contenido: "Editado" }] },
      });
      await abrir({ informe: INFORME_GUARDADO });

      // Act
      fireEvent.change(screen.getByLabelText("Fortalezas"), { target: { value: "Editado" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar informe" }));

      // Assert
      expect(await screen.findByText("Informe guardado.")).toBeTruthy();
      const [ruta, cuerpo] = put.calls.mostRecent().args;
      expect(ruta).toBe("/solicitudes/s1/informe");
      expect(cuerpo.secciones[0]).toEqual({ titulo: "Fortalezas", contenido: "Editado" });
      expect(cuerpo.apuntes).toBe("Apuntes guardados");
      expect(cuerpo.estado).toBe("borrador");
    });

    it("si el guardado falla, muestra el error", async () => {
      spyOn(api, "put").and.rejectWith(errorAxios(403, "Solo el evaluador responsable de la solicitud (o un admin) puede generar o editar su informe."));
      await abrir({ informe: INFORME_GUARDADO });

      fireEvent.click(screen.getByRole("button", { name: "Guardar informe" }));

      expect(await screen.findByText(/Solo el evaluador responsable de la solicitud/)).toBeTruthy();
    });
  });
});
