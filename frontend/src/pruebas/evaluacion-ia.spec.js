// EvaluacionIa: tarjeta de evaluación de apoyo con nota (CV + informe de entrevista). El backend
// se reemplaza con spies sobre la instancia de axios.
import { render, screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import EvaluacionIa from "../components/EvaluacionIa";
import { MENSAJE_CUOTA_AGOTADA } from "../utils/mensajeErrorIa";
import { simularGet, errorAxios, esperarQue } from "./ayudantes";

const RUTA_GET = "/solicitudes/s1/informe/evaluacion";
const RUTA_GENERAR = "/solicitudes/s1/informe/evaluacion/generar";
const AVISO = /Apoyo generado por IA; la decisión final es del evaluador/;

function crearEvaluacion(cambios = {}) {
  return {
    puntajeGlobal: 72,
    competencias: [
      { nombre: "Orientación a resultados", puntaje: 80, justificacion: "Superó metas de venta dos años seguidos." },
      { nombre: "Manejo del rechazo", puntaje: null, justificacion: "Sin evidencia suficiente" },
    ],
    fortalezas: ["Experiencia en ventas en terreno"],
    areasDeMejora: ["Uso de herramientas CRM"],
    recomendaciones: ["Profundizar en cómo maneja clientes que rechazan la oferta"],
    resumen: "Candidata con experiencia comercial relevante.\nFalta evidencia sobre manejo del rechazo.",
    modeloIa: "gemini-prueba",
    ...cambios,
  };
}

const GUARDADA = {
  ...crearEvaluacion({ puntajeGlobal: 65 }),
  generadoPor: { nombre: "Eva Evaluadora" },
  generadoEn: "2026-10-08T15:00:00.000Z",
};

async function abrir({ guardada = null, puedeEditar = true, tieneCv = true, tieneInforme = true, apuntes = "" } = {}) {
  simularGet({ [RUTA_GET]: guardada });
  render(
    <EvaluacionIa
      solicitudId="s1"
      puedeEditar={puedeEditar}
      apuntes={apuntes}
      tieneCv={tieneCv}
      tieneInforme={tieneInforme}
    />
  );
  await esperarQue(() => !screen.queryByText("Cargando evaluación..."), "que termine de cargar");
}

const botonGenerar = () => screen.queryByRole("button", { name: "Generar evaluación con IA" });

describe("EvaluacionIa", () => {
  describe("render y permisos", () => {
    it("muestra el título y el aviso de apoyo de IA siempre visible", async () => {
      await abrir();

      expect(screen.getByRole("heading", { name: "Evaluación de apoyo con IA" })).toBeTruthy();
      expect(screen.getByText(AVISO)).toBeTruthy();
    });

    it("muestra la evaluación guardada: nota grande, competencias con barra, bloques y autoría", async () => {
      await abrir({ guardada: GUARDADA, puedeEditar: false });

      expect(screen.getByLabelText("Nota global: 65 de 100")).toBeTruthy();
      expect(screen.getByText("65")).toBeTruthy();
      expect(screen.getByRole("progressbar", { name: "Orientación a resultados" }).getAttribute("aria-valuenow")).toBe("80");
      expect(screen.getByText("80/100")).toBeTruthy();
      expect(screen.getByText("Superó metas de venta dos años seguidos.")).toBeTruthy();
      // La competencia sin evidencia no muestra un 0 (se leería como desempeño malo)
      expect(screen.getByText("Sin evidencia")).toBeTruthy();
      expect(screen.getByRole("progressbar", { name: "Manejo del rechazo" }).hasAttribute("aria-valuenow")).toBeFalse();
      expect(within(screen.getByText("Fortalezas").parentElement).getByText("Experiencia en ventas en terreno")).toBeTruthy();
      expect(within(screen.getByText("Áreas de mejora").parentElement).getByText("Uso de herramientas CRM")).toBeTruthy();
      expect(screen.getByText("Profundizar en cómo maneja clientes que rechazan la oferta")).toBeTruthy();
      expect(screen.getByText(/Guardada por Eva Evaluadora/)).toBeTruthy();
      expect(screen.getByText(/generada con gemini-prueba/)).toBeTruthy();
    });

    it("una lista vacía dice que no hay evidencia suficiente", async () => {
      await abrir({ guardada: { ...GUARDADA, fortalezas: [] }, puedeEditar: false });

      expect(within(screen.getByText("Fortalezas").parentElement).getByText("Sin evidencia suficiente.")).toBeTruthy();
    });

    it("sin permiso de edición no ofrece generar y explica quién puede hacerlo", async () => {
      await abrir({ puedeEditar: false });

      expect(botonGenerar()).toBeNull();
      expect(screen.getByText(/Solo el evaluador responsable \(o un admin\) puede generarla/)).toBeTruthy();
    });

    it("con permiso de edición muestra el botón habilitado", async () => {
      await abrir();

      expect(botonGenerar().disabled).toBeFalse();
    });

    it("si falta el CV o el informe de entrevista, el botón queda deshabilitado con una explicación", async () => {
      await abrir({ tieneInforme: false });

      expect(botonGenerar().disabled).toBeTrue();
      expect(screen.getByText(/debe tener cargados el CV y el informe de entrevista/)).toBeTruthy();
    });

    it("si no se puede cargar la evaluación guardada, muestra el error", async () => {
      spyOn(api, "get").and.rejectWith(errorAxios(500, "Error al obtener la evaluación"));
      render(<EvaluacionIa solicitudId="s1" puedeEditar tieneCv tieneInforme />);

      expect(await screen.findByText("Error al obtener la evaluación")).toBeTruthy();
    });
  });

  describe("generar", () => {
    it("muestra el estado de carga y luego el borrador sin guardarlo", async () => {
      // Arrange: la respuesta de la IA queda pendiente hasta que la prueba la libere
      let responder;
      const post = spyOn(api, "post").and.returnValue(new Promise((r) => (responder = r)));
      const put = spyOn(api, "put");
      await abrir({ apuntes: "Buena disposición" });

      // Act
      fireEvent.click(botonGenerar());

      // Assert: cargando
      expect(await screen.findByText("Generando… puede tardar hasta 1 minuto.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Generando..." }).disabled).toBeTrue();
      expect(post).toHaveBeenCalledOnceWith(RUTA_GENERAR, { apuntes: "Buena disposición" });

      // Act: llega el borrador
      responder({ data: { ...crearEvaluacion(), avisos: ["El CV es largo: la IA solo analizó los primeros 15.000."] } });

      // Assert: se muestra como borrador, con los avisos y sin llamar a guardar
      expect(await screen.findByText(/Borrador sin guardar/)).toBeTruthy();
      expect(screen.getByLabelText("Nota global: 72 de 100")).toBeTruthy();
      expect(screen.getByText("El CV es largo: la IA solo analizó los primeros 15.000.")).toBeTruthy();
      expect(screen.getByText(AVISO)).toBeTruthy();
      expect(screen.queryByText("Generando… puede tardar hasta 1 minuto.")).toBeNull();
      expect(put).not.toHaveBeenCalled();
    });

    it("ante cuota agotada (429) muestra un mensaje amable", async () => {
      spyOn(api, "post").and.rejectWith(errorAxios(429, "Se agoto la cuota gratuita"));
      await abrir();

      fireEvent.click(botonGenerar());

      expect(await screen.findByText(MENSAJE_CUOTA_AGOTADA)).toBeTruthy();
      expect(botonGenerar().disabled).toBeFalse();
    });

    it("ante otros errores muestra el mensaje del servidor", async () => {
      spyOn(api, "post").and.rejectWith(errorAxios(422, "No se pudo leer el contenido del archivo (el CV)."));
      await abrir();

      fireEvent.click(botonGenerar());

      expect(await screen.findByText("No se pudo leer el contenido del archivo (el CV).")).toBeTruthy();
    });

    it("si el error no trae mensaje, muestra uno genérico", async () => {
      spyOn(api, "post").and.rejectWith(new Error("Network Error"));
      await abrir();

      fireEvent.click(botonGenerar());

      expect(await screen.findByText("No se pudo generar la evaluación. Intenta nuevamente.")).toBeTruthy();
    });

    it("descartar el borrador vuelve a la evaluación guardada", async () => {
      spyOn(api, "post").and.resolveTo({ data: crearEvaluacion({ puntajeGlobal: 90 }) });
      await abrir({ guardada: GUARDADA });
      fireEvent.click(botonGenerar());
      await screen.findByLabelText("Nota global: 90 de 100");

      fireEvent.click(screen.getByRole("button", { name: "Descartar borrador" }));

      expect(screen.getByLabelText("Nota global: 65 de 100")).toBeTruthy();
      expect(screen.queryByText(/Borrador sin guardar/)).toBeNull();
    });
  });

  describe("confirmar y guardar", () => {
    it("guarda el borrador en la solicitud solo al confirmar", async () => {
      // Arrange
      const borrador = { ...crearEvaluacion(), avisos: [] };
      spyOn(api, "post").and.resolveTo({ data: borrador });
      const put = spyOn(api, "put").and.resolveTo({
        data: { ...crearEvaluacion(), generadoPor: { nombre: "Eva Evaluadora" }, generadoEn: "2026-10-09T12:00:00.000Z" },
      });
      await abrir();
      fireEvent.click(botonGenerar());
      await screen.findByText(/Borrador sin guardar/);

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Confirmar y guardar" }));

      // Assert
      expect(await screen.findByText("Evaluación guardada en la solicitud.")).toBeTruthy();
      const [ruta, cuerpo] = put.calls.mostRecent().args;
      expect(ruta).toBe("/solicitudes/s1/informe/evaluacion");
      expect(cuerpo).toEqual({
        puntajeGlobal: 72,
        competencias: borrador.competencias,
        fortalezas: borrador.fortalezas,
        areasDeMejora: borrador.areasDeMejora,
        recomendaciones: borrador.recomendaciones,
        resumen: borrador.resumen,
        modeloIa: "gemini-prueba",
      });
      expect(screen.queryByText(/Borrador sin guardar/)).toBeNull();
      expect(screen.queryByRole("button", { name: "Confirmar y guardar" })).toBeNull();
      expect(screen.getByText(/Guardada por Eva Evaluadora/)).toBeTruthy();
    });

    it("si el servidor rechaza el guardado, mantiene el borrador y muestra el error", async () => {
      spyOn(api, "post").and.resolveTo({ data: crearEvaluacion() });
      spyOn(api, "put").and.rejectWith(errorAxios(400, "La evaluación no es válida: El puntaje global debe ser un entero entre 0 y 100."));
      await abrir();
      fireEvent.click(botonGenerar());
      await screen.findByText(/Borrador sin guardar/);

      fireEvent.click(screen.getByRole("button", { name: "Confirmar y guardar" }));

      expect(await screen.findByText(/La evaluación no es válida/)).toBeTruthy();
      expect(screen.getByText(/Borrador sin guardar/)).toBeTruthy();
    });

    it("si el guardado falla sin mensaje, muestra uno genérico", async () => {
      spyOn(api, "post").and.resolveTo({ data: crearEvaluacion() });
      spyOn(api, "put").and.rejectWith(new Error("Network Error"));
      await abrir();
      fireEvent.click(botonGenerar());
      await screen.findByText(/Borrador sin guardar/);

      fireEvent.click(screen.getByRole("button", { name: "Confirmar y guardar" }));

      expect(await screen.findByText("No se pudo guardar la evaluación.")).toBeTruthy();
    });
  });
});
