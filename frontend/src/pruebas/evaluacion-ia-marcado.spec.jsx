// EvaluacionIa: marcado de Bootstrap (banner, barras de progreso accesibles, spinners, alertas) y
// que confirmar guarda y descartar no guarda. El backend se reemplaza con spies sobre axios.
import { render, screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import EvaluacionIa from "../components/EvaluacionIa";
import { simularGet, errorAxios, esperarQue } from "./ayudantes";

const RUTA_GET = "/solicitudes/s1/informe/evaluacion";

const EVALUACION = {
  puntajeGlobal: 72,
  competencias: [
    { nombre: "Orientación a resultados", puntaje: 80, justificacion: "Superó metas de venta." },
    { nombre: "Trabajo en equipo", puntaje: 0, justificacion: "Evidencia de bajo desempeño." },
    { nombre: "Manejo del rechazo", puntaje: null, justificacion: "No hay datos." },
  ],
  fortalezas: ["Experiencia en ventas"],
  areasDeMejora: ["Uso de CRM"],
  recomendaciones: ["Profundizar en el manejo del rechazo"],
  resumen: "Candidata con experiencia comercial.",
  modeloIa: "gemini-prueba",
};

async function abrir({ guardada = null, puedeEditar = true } = {}) {
  simularGet({ [RUTA_GET]: guardada });
  render(<EvaluacionIa solicitudId="s1" puedeEditar={puedeEditar} apuntes="Apuntes" tieneCv tieneInforme />);
  await esperarQue(() => !screen.queryByText("Cargando evaluación..."), "que termine de cargar");
}

const botonGenerar = () => screen.getByRole("button", { name: /^Generar/ });

describe("EvaluacionIa: marcado de Bootstrap", () => {
  it("el banner de IA es un alert-info visible siempre y también junto al borrador", async () => {
    vi.spyOn(api, "post").mockResolvedValue({ data: { ...EVALUACION, avisos: [] } });
    await abrir();
    const banner = () => screen.getByText(/Apoyo generado por IA; la decisión final es del evaluador/);
    expect(banner().classList.contains("alert-info")).toBe(true);

    fireEvent.click(botonGenerar());
    await screen.findByText(/Borrador sin guardar/);

    expect(banner().classList.contains("alert-info")).toBe(true);
    expect(screen.getByLabelText("Nota global: 72 de 100")).toBeTruthy();
  });

  it("la nota global se muestra grande, con un badge", async () => {
    await abrir({ guardada: { ...EVALUACION, generadoPor: { nombre: "Eva" }, generadoEn: "2026-10-08T15:00:00.000Z" } });

    const nota = within(screen.getByLabelText("Nota global: 72 de 100"));
    expect(nota.getByText("72").classList.contains("display-5")).toBe(true);
    expect(nota.getByText("de 100").classList.contains("badge")).toBe(true);
  });

  it("cada competencia con puntaje tiene una barra de progreso con los atributos aria y el ancho de su valor", async () => {
    await abrir({ guardada: { ...EVALUACION, generadoPor: { nombre: "Eva" }, generadoEn: "2026-10-08T15:00:00.000Z" } });

    const barra80 = screen.getByRole("progressbar", { name: "Orientación a resultados" });
    expect(barra80.getAttribute("aria-valuenow")).toBe("80");
    expect(barra80.getAttribute("aria-valuemin")).toBe("0");
    expect(barra80.getAttribute("aria-valuemax")).toBe("100");
    expect(barra80.classList.contains("progress")).toBe(true);
    expect(barra80.querySelector(".progress-bar").style.width).toBe("80%");

    // Un 0 real sigue siendo una barra (vacía), distinta de "sin evidencia".
    const barra0 = screen.getByRole("progressbar", { name: "Trabajo en equipo" });
    expect(barra0.getAttribute("aria-valuenow")).toBe("0");
    expect(barra0.querySelector(".progress-bar").style.width).toBe("0%");
  });

  it('la competencia sin evidencia muestra el badge "Sin evidencia suficiente" y no tiene barra', async () => {
    await abrir({ guardada: { ...EVALUACION, generadoPor: { nombre: "Eva" }, generadoEn: "2026-10-08T15:00:00.000Z" } });

    const badge = screen.getByText("Sin evidencia suficiente", { selector: ".badge" });
    expect(badge.classList.contains("text-bg-secondary")).toBe(true);
    expect(screen.queryByRole("progressbar", { name: "Manejo del rechazo" })).toBeNull();
    expect(screen.getAllByRole("progressbar").length).toBe(2);
  });

  it("mientras genera, el botón queda deshabilitado con spinner y se anuncia el estado", async () => {
    vi.spyOn(api, "post").mockReturnValue(new Promise(() => {}));
    await abrir();

    fireEvent.click(botonGenerar());

    const boton = await screen.findByRole("button", { name: "Generando..." });
    expect(boton.disabled).toBe(true);
    expect(boton.querySelector(".spinner-border")).not.toBeNull();
    const estado = screen.getByRole("status");
    expect(within(estado).getByText("Generando… puede tardar hasta 1 minuto.")).toBeTruthy();
    expect(estado.querySelector(".spinner-border")).not.toBeNull();
  });

  it("un error de la IA se muestra como alert-danger con role alert", async () => {
    vi.spyOn(api, "post").mockRejectedValue(errorAxios(500, "El servicio de IA no está disponible."));
    await abrir();

    fireEvent.click(botonGenerar());

    const alerta = await screen.findByRole("alert");
    expect(alerta.classList.contains("alert-danger")).toBe(true);
    expect(alerta.textContent).toBe("El servicio de IA no está disponible.");
  });

  it("confirmar y guardar llama a PUT una vez y descartar no llama a nada", async () => {
    vi.spyOn(api, "post").mockResolvedValue({ data: { ...EVALUACION, avisos: [] } });
    const put = vi.spyOn(api, "put").mockResolvedValue({
      data: { ...EVALUACION, generadoPor: { nombre: "Eva" }, generadoEn: "2026-10-09T12:00:00.000Z" },
    });
    await abrir();

    // Descartar: el borrador desaparece y no se guarda nada.
    fireEvent.click(botonGenerar());
    await screen.findByText(/Borrador sin guardar/);
    fireEvent.click(screen.getByRole("button", { name: "Descartar borrador" }));
    expect(screen.queryByText(/Borrador sin guardar/)).toBeNull();
    expect(put).not.toHaveBeenCalled();

    // Confirmar: se guarda una sola vez y aparece el aviso de éxito.
    fireEvent.click(botonGenerar());
    await screen.findByText(/Borrador sin guardar/);
    const confirmar = screen.getByRole("button", { name: "Confirmar y guardar" });
    expect(confirmar.classList.contains("btn-success")).toBe(true);
    expect(screen.getByRole("button", { name: "Descartar borrador" }).classList.contains("btn-outline-secondary")).toBe(true);
    fireEvent.click(confirmar);

    expect(await screen.findByText("Evaluación guardada en la solicitud.")).toBeTruthy();
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("mientras guarda, Confirmar queda deshabilitado con spinner", async () => {
    vi.spyOn(api, "post").mockResolvedValue({ data: { ...EVALUACION, avisos: [] } });
    vi.spyOn(api, "put").mockReturnValue(new Promise(() => {}));
    await abrir();
    fireEvent.click(botonGenerar());
    await screen.findByText(/Borrador sin guardar/);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar y guardar" }));

    const guardando = await screen.findByRole("button", { name: "Guardando..." });
    expect(guardando.disabled).toBe(true);
    expect(guardando.querySelector(".spinner-border")).not.toBeNull();
  });

  it("es una tarjeta de Bootstrap con su encabezado", async () => {
    await abrir();

    const titulo = screen.getByRole("heading", { name: "Evaluación de apoyo con IA" });
    expect(titulo.parentElement.classList.contains("card-header")).toBe(true);
  });
});
