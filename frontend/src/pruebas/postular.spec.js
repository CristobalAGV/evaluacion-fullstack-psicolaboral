// Formulario público /postular. El backend se reemplaza con spies sobre la instancia de axios:
// GET /postulaciones/familias y POST /postulaciones.
import { screen, fireEvent, waitFor } from "@testing-library/react";
import api from "../services/api";
import Postular from "../pages/Postular";
import { renderizar, archivoDePrueba, errorAxios, elegirArchivo } from "./ayudantes";

const FAMILIAS = [
  { _id: "fam-ventas", nombre: "Ventas" },
  { _id: "fam-operaciones", nombre: "Operaciones" },
];
const CINCO_MB = 5 * 1024 * 1024;

describe("Postular (formulario público)", () => {
  let get;

  beforeEach(() => {
    get = spyOn(api, "get").and.resolveTo({ data: FAMILIAS });
  });

  async function abrirFormulario() {
    renderizar(<Postular />, { ruta: "/postular", rutaDelElemento: "/postular" });
    await screen.findByRole("option", { name: "Ventas" });
  }

  function completarDatos({ telefono = "+56 9 1234 5678", cv = archivoDePrueba("cv.pdf", "application/pdf") } = {}) {
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Camila Muñoz" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "camila@ejemplo.cl" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: telefono } });
    fireEvent.change(screen.getByLabelText("Área de interés"), { target: { value: "fam-ventas" } });
    fireEvent.change(screen.getByLabelText("Cargo al que postulas"), { target: { value: "Ejecutiva de ventas" } });
    if (cv) elegirArchivo(document.querySelector('input[type="file"]'), cv);
  }

  const botonEnviar = () => screen.getByRole("button", { name: "Enviar postulación" });

  it("carga las áreas de interés desde el endpoint público", async () => {
    await abrirFormulario();

    expect(get).toHaveBeenCalledWith("/postulaciones/familias");
    expect(screen.getByRole("option", { name: "Operaciones" })).toBeTruthy();
    expect(screen.getByLabelText("Correo").getAttribute("placeholder")).toBe("nombre@ejemplo.cl");
  });

  describe("validación del teléfono chileno", () => {
    it("rechaza un número que no es celular chileno y deshabilita el envío", async () => {
      await abrirFormulario();

      completarDatos({ telefono: "22 345 6789" });

      expect(screen.getByText("Ingresa un celular chileno válido: +56 9 1234 5678")).toBeTruthy();
      expect(botonEnviar().disabled).toBeTrue();
    });

    it("acepta +56 9 con y sin espacios", async () => {
      await abrirFormulario();

      for (const telefono of ["+56 9 1234 5678", "+56912345678", "56 9 1234 5678"]) {
        completarDatos({ telefono });
        expect(screen.queryByText("Ingresa un celular chileno válido: +56 9 1234 5678")).withContext(telefono).toBeNull();
      }
    });
  });

  describe("validación del CV", () => {
    it("rechaza un archivo de más de 5 MB", async () => {
      await abrirFormulario();

      completarDatos({ cv: archivoDePrueba("cv-pesado.pdf", "application/pdf", CINCO_MB + 1) });

      expect(screen.getByText("El CV supera el tamaño máximo de 5 MB.")).toBeTruthy();
      expect(botonEnviar().disabled).toBeTrue();
    });

    it("rechaza un tipo de archivo no permitido", async () => {
      await abrirFormulario();

      completarDatos({ cv: archivoDePrueba("foto.png", "image/png") });

      expect(screen.getByText("Formato de CV no permitido. Usa PDF, DOC o DOCX.")).toBeTruthy();
      expect(botonEnviar().disabled).toBeTrue();
    });
  });

  it('envía los datos como FormData y muestra "Postulación recibida"', async () => {
    // Arrange
    const post = spyOn(api, "post").and.resolveTo({ data: { mensaje: "Postulación recibida" } });
    await abrirFormulario();
    const cv = archivoDePrueba("cv-camila.pdf", "application/pdf");
    completarDatos({ cv });

    // Act
    fireEvent.click(botonEnviar());

    // Assert
    expect(await screen.findByRole("heading", { name: "Postulación recibida" })).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
    const [ruta, datos] = post.calls.mostRecent().args;
    expect(ruta).toBe("/postulaciones");
    expect(datos).toBeInstanceOf(FormData);
    expect(datos.get("nombre")).toBe("Camila Muñoz");
    expect(datos.get("correo")).toBe("camila@ejemplo.cl");
    expect(datos.get("telefono")).toBe("+56 9 1234 5678");
    expect(datos.get("familiaDeCargo")).toBe("fam-ventas");
    expect(datos.get("cargo")).toBe("Ejecutiva de ventas");
    expect(datos.get("cv").name).toBe("cv-camila.pdf");
    expect(datos.get("sitioWeb")).toBe(""); // honeypot vacío
  });

  it("muestra el mensaje del servidor si rechaza la postulación (correo repetido)", async () => {
    spyOn(api, "post").and.rejectWith(errorAxios(409, "Ya recibimos una postulación con este correo."));
    await abrirFormulario();
    completarDatos();

    fireEvent.click(botonEnviar());

    expect(await screen.findByText("Ya recibimos una postulación con este correo.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Postulación recibida" })).toBeNull();
  });

  it("avisa si no pudo cargar las áreas de interés", async () => {
    get.and.rejectWith(errorAxios(500, "Error"));

    renderizar(<Postular />, { ruta: "/postular", rutaDelElemento: "/postular" });

    await waitFor(() =>
      expect(screen.getByText("No pudimos cargar los cargos disponibles. Recarga la página.")).toBeTruthy()
    );
  });
});
