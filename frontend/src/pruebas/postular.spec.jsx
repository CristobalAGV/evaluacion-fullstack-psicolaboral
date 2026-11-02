// Formulario público /postular. El backend se reemplaza con spies sobre la instancia de axios:
// GET /postulaciones/familias y POST /postulaciones.
import { screen, fireEvent, waitFor } from "@testing-library/react";
import api from "../services/api";
import Postular from "../pages/Postular";
import {
  renderizar,
  archivoDePrueba,
  errorAxios,
  elegirArchivo,
} from "./ayudantes";

const FAMILIAS = [
  { _id: "fam-ventas", nombre: "Ventas" },
  { _id: "fam-operaciones", nombre: "Operaciones" },
];

const CINCO_MB = 5 * 1024 * 1024;

describe("Postular (formulario público)", () => {
  let get;

  beforeEach(() => {
    get = vi.spyOn(api, "get").mockResolvedValue({ data: FAMILIAS });
  });

  async function abrirFormulario() {
    renderizar(<Postular />, {
      ruta: "/postular",
      rutaDelElemento: "/postular",
    });

    await screen.findByRole("option", { name: "Ventas" });
  }

  function completarDatos({
    telefono = "+56 9 1234 5678",
    cv = archivoDePrueba("cv.pdf", "application/pdf"),
  } = {}) {
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Camila Muñoz" },
    });

    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "camila@ejemplo.cl" },
    });

    fireEvent.change(screen.getByLabelText("Teléfono"), {
      target: { value: telefono },
    });

    fireEvent.change(screen.getByLabelText("Área de interés"), {
      target: { value: "fam-ventas" },
    });

    fireEvent.change(screen.getByLabelText("Cargo al que postulas"), {
      target: { value: "Ejecutivo de Ventas" },
    });

    if (cv) {
      elegirArchivo(document.querySelector('input[type="file"]'), cv);
    }
  }

  const botonEnviar = () =>
    screen.getByRole("button", { name: "Enviar postulación" });

  it("carga las áreas de interés desde el endpoint público", async () => {
    await abrirFormulario();

    expect(get).toHaveBeenCalledWith("/postulaciones/familias");

    expect(
      screen.getByRole("option", { name: "Operaciones" })
    ).toBeTruthy();

    expect(
      screen.getByLabelText("Correo").getAttribute("placeholder")
    ).toBe("nombre@ejemplo.cl");
  });

  describe("catálogo de cargos", () => {
    it("mantiene el cargo deshabilitado hasta seleccionar un área", async () => {
      await abrirFormulario();

      const cargo = screen.getByLabelText("Cargo al que postulas");

      expect(cargo.disabled).toBe(true);
      expect(cargo.value).toBe("");

      expect(
        screen.getByRole("option", {
          name: "Selecciona primero un área",
        })
      ).toBeTruthy();
    });

    it("muestra solamente los cargos correspondientes al área seleccionada", async () => {
      await abrirFormulario();

      fireEvent.change(screen.getByLabelText("Área de interés"), {
        target: { value: "fam-operaciones" },
      });

      const cargo = screen.getByLabelText("Cargo al que postulas");

      expect(cargo.disabled).toBe(false);

      expect(
        screen.getByRole("option", { name: "Operador de Planta" })
      ).toBeTruthy();

      expect(
        screen.getByRole("option", { name: "Técnico de Mantención" })
      ).toBeTruthy();

      expect(
        screen.getByRole("option", {
          name: "Supervisor de Operaciones",
        })
      ).toBeTruthy();

      expect(
        screen.queryByRole("option", {
          name: "Ejecutivo de Ventas",
        })
      ).toBeNull();
    });

    it("al cambiar de área limpia el cargo seleccionado anteriormente", async () => {
      await abrirFormulario();

      const area = screen.getByLabelText("Área de interés");
      const cargo = screen.getByLabelText("Cargo al que postulas");

      fireEvent.change(area, {
        target: { value: "fam-operaciones" },
      });

      fireEvent.change(cargo, {
        target: { value: "Operador de Planta" },
      });

      expect(cargo.value).toBe("Operador de Planta");

      fireEvent.change(area, {
        target: { value: "fam-ventas" },
      });

      expect(cargo.value).toBe("");

      expect(
        screen.getByRole("option", { name: "Ejecutivo de Ventas" })
      ).toBeTruthy();

      expect(
        screen.queryByRole("option", { name: "Operador de Planta" })
      ).toBeNull();
    });

    it("muestra descripción y requisitos del cargo seleccionado", async () => {
      await abrirFormulario();

      fireEvent.change(screen.getByLabelText("Área de interés"), {
        target: { value: "fam-operaciones" },
      });

      fireEvent.change(screen.getByLabelText("Cargo al que postulas"), {
        target: { value: "Operador de Planta" },
      });

      expect(
        screen.getByRole("heading", { name: "Operador de Planta" })
      ).toBeTruthy();

      expect(
        screen.getByText(
          /Apoya la operación diaria de procesos productivos/i
        )
      ).toBeTruthy();

      expect(
        screen.getByText("Enseñanza media completa.")
      ).toBeTruthy();

      expect(
        screen.getByText(
          "Información ficticia para demostración académica."
        )
      ).toBeTruthy();
    });
  });

  describe("validación del teléfono chileno", () => {
    it("rechaza un número que no es celular chileno y deshabilita el envío", async () => {
      await abrirFormulario();

      completarDatos({ telefono: "22 345 6789" });

      expect(
        screen.getByText(
          "Ingresa un celular chileno válido: +56 9 1234 5678"
        )
      ).toBeTruthy();

      expect(botonEnviar().disabled).toBe(true);
    });

    it("acepta +56 9 con y sin espacios", async () => {
      await abrirFormulario();

      for (const telefono of [
        "+56 9 1234 5678",
        "+56912345678",
        "56 9 1234 5678",
      ]) {
        completarDatos({ telefono });

        expect(
          screen.queryByText(
            "Ingresa un celular chileno válido: +56 9 1234 5678"
          ),
          telefono
        ).toBeNull();
      }
    });
  });

  describe("validación del CV", () => {
    it("rechaza un archivo de más de 5 MB", async () => {
      await abrirFormulario();

      completarDatos({
        cv: archivoDePrueba(
          "cv-pesado.pdf",
          "application/pdf",
          CINCO_MB + 1
        ),
      });

      expect(
        screen.getByText("El CV supera el tamaño máximo de 5 MB.")
      ).toBeTruthy();

      expect(botonEnviar().disabled).toBe(true);
    });

    it("rechaza un tipo de archivo no permitido", async () => {
      await abrirFormulario();

      completarDatos({
        cv: archivoDePrueba("foto.png", "image/png"),
      });

      expect(
        screen.getByText(
          "Formato de CV no permitido. Usa PDF, DOC o DOCX."
        )
      ).toBeTruthy();

      expect(botonEnviar().disabled).toBe(true);
    });
  });

  it('envía los datos como FormData y muestra "Postulación recibida"', async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({
      data: { mensaje: "Postulación recibida" },
    });

    await abrirFormulario();

    const cv = archivoDePrueba(
      "cv-camila.pdf",
      "application/pdf"
    );

    completarDatos({ cv });

    fireEvent.click(botonEnviar());

    expect(
      await screen.findByRole("heading", {
        name: "Postulación recibida",
      })
    ).toBeTruthy();

    expect(post).toHaveBeenCalledTimes(1);

    const [ruta, datos] = post.mock.lastCall;

    expect(ruta).toBe("/postulaciones");
    expect(datos).toBeInstanceOf(FormData);

    expect(datos.get("nombre")).toBe("Camila Muñoz");
    expect(datos.get("correo")).toBe("camila@ejemplo.cl");
    expect(datos.get("telefono")).toBe("+56 9 1234 5678");
    expect(datos.get("familiaDeCargo")).toBe("fam-ventas");
    expect(datos.get("cargo")).toBe("Ejecutivo de Ventas");
    expect(datos.get("cv").name).toBe("cv-camila.pdf");
    expect(datos.get("sitioWeb")).toBe("");
  });

  it("muestra el mensaje del servidor si rechaza la postulación (correo repetido)", async () => {
    vi.spyOn(api, "post").mockRejectedValue(
      errorAxios(
        409,
        "Ya recibimos una postulación con este correo."
      )
    );

    await abrirFormulario();
    completarDatos();

    fireEvent.click(botonEnviar());

    expect(
      await screen.findByText(
        "Ya recibimos una postulación con este correo."
      )
    ).toBeTruthy();

    expect(
      screen.queryByRole("heading", {
        name: "Postulación recibida",
      })
    ).toBeNull();
  });

  it("avisa si no pudo cargar las áreas de interés", async () => {
    get.mockRejectedValue(errorAxios(500, "Error"));

    renderizar(<Postular />, {
      ruta: "/postular",
      rutaDelElemento: "/postular",
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          "No pudimos cargar los cargos disponibles. Recarga la página."
        )
      ).toBeTruthy()
    );
  });

  describe("validación visible (is-invalid e invalid-feedback)", () => {
    it("al enviar vacío marca cada campo obligatorio, muestra su mensaje y no envía nada", async () => {
      const post = vi.spyOn(api, "post");

      await abrirFormulario();

      fireEvent.click(botonEnviar());

      for (const etiqueta of [
        "Nombre completo",
        "Correo",
        "Teléfono",
        "Área de interés",
      ]) {
        const campo = screen.getByLabelText(etiqueta);

        expect(
          campo.classList.contains("is-invalid"),
          etiqueta
        ).toBe(true);

        expect(
          campo.nextElementSibling.classList.contains(
            "invalid-feedback"
          ),
          etiqueta
        ).toBe(true);

        expect(
          campo.nextElementSibling.textContent,
          etiqueta
        ).toBe("Este campo es obligatorio");

        expect(campo.getAttribute("aria-invalid")).toBe("true");

        expect(
          document.getElementById(
            campo.getAttribute("aria-describedby")
          )
        ).toBe(campo.nextElementSibling);
      }

      const cargo = screen.getByLabelText("Cargo al que postulas");

      expect(cargo.disabled).toBe(true);
      expect(cargo.classList.contains("is-invalid")).toBe(false);
      expect(cargo.value).toBe("");

      expect(document.activeElement).toBe(
        screen.getByLabelText("Nombre completo")
      );

      const cv = document.querySelector('input[type="file"]');

      expect(cv.classList.contains("is-invalid")).toBe(true);

      expect(cv.nextElementSibling.textContent).toBe(
        "Este campo es obligatorio"
      );

      expect(post).not.toHaveBeenCalled();
    });

    it("un correo mal escrito se marca como inválido con su mensaje", async () => {
      await abrirFormulario();

      completarDatos();

      fireEvent.change(screen.getByLabelText("Correo"), {
        target: { value: "no-es-un-correo" },
      });

      fireEvent.click(botonEnviar());

      const correo = screen.getByLabelText("Correo");

      expect(correo.classList.contains("is-invalid")).toBe(true);

      expect(correo.nextElementSibling.textContent).toBe(
        "Ingresa un correo válido"
      );
    });

    it("al volver a escribir en un campo marcado, se quita su mensaje", async () => {
      await abrirFormulario();

      fireEvent.click(botonEnviar());

      expect(
        screen
          .getByLabelText("Nombre completo")
          .classList.contains("is-invalid")
      ).toBe(true);

      fireEvent.change(
        screen.getByLabelText("Nombre completo"),
        {
          target: { value: "Camila" },
        }
      );

      const nombre = screen.getByLabelText("Nombre completo");

      expect(nombre.classList.contains("is-invalid")).toBe(false);
      expect(nombre.nextElementSibling).toBeNull();

      expect(
        screen
          .getByLabelText("Correo")
          .classList.contains("is-invalid")
      ).toBe(true);
    });

    it("el teléfono inválido y el CV rechazado marcan su campo con el mensaje al lado", async () => {
      await abrirFormulario();

      completarDatos({
        telefono: "22 345 6789",
        cv: archivoDePrueba("foto.png", "image/png"),
      });

      const telefono = screen.getByLabelText("Teléfono");

      expect(
        telefono.classList.contains("is-invalid")
      ).toBe(true);

      expect(telefono.nextElementSibling.textContent).toBe(
        "Ingresa un celular chileno válido: +56 9 1234 5678"
      );

      const cv = document.querySelector('input[type="file"]');

      expect(cv.classList.contains("is-invalid")).toBe(true);

      expect(cv.nextElementSibling.textContent).toBe(
        "Formato de CV no permitido. Usa PDF, DOC o DOCX."
      );
    });

    it("el CV de más de 5 MB marca el campo y el nombre del archivo elegido sigue visible", async () => {
      await abrirFormulario();

      completarDatos({
        cv: archivoDePrueba(
          "cv-pesado.pdf",
          "application/pdf",
          CINCO_MB + 1
        ),
      });

      const cv = document.querySelector('input[type="file"]');

      expect(cv.classList.contains("is-invalid")).toBe(true);

      expect(cv.nextElementSibling.textContent).toBe(
        "El CV supera el tamaño máximo de 5 MB."
      );

      expect(
        screen.getByText("cv-pesado.pdf")
      ).toBeTruthy();
    });
  });

  describe("envío", () => {
    it("mientras envía, el botón queda deshabilitado con un indicador de carga", async () => {
      vi.spyOn(api, "post").mockReturnValue(
        new Promise(() => {})
      );

      await abrirFormulario();
      completarDatos();

      fireEvent.click(botonEnviar());

      const boton = await screen.findByRole("button", {
        name: "Enviando...",
      });

      expect(boton.disabled).toBe(true);

      expect(
        boton.querySelector(".spinner-border")
      ).not.toBeNull();
    });

    it("tras enviar muestra el mensaje de éxito como alerta, con el nombre de pila", async () => {
      vi.spyOn(api, "post").mockResolvedValue({
        data: { mensaje: "Postulación recibida" },
      });

      await abrirFormulario();
      completarDatos();

      fireEvent.click(botonEnviar());

      const alerta = await screen.findByRole("status");

      expect(
        alerta.classList.contains("alert-success")
      ).toBe(true);

      expect(alerta.textContent).toContain(
        "Gracias, Camila."
      );
    });

    it("en la pantalla de éxito el ícono, el título y el mensaje quedan centrados", async () => {
      vi.spyOn(api, "post").mockResolvedValue({
        data: { mensaje: "Postulación recibida" },
      });

      await abrirFormulario();
      completarDatos();

      fireEvent.click(botonEnviar());

      const titulo = await screen.findByRole("heading", {
        name: "Postulación recibida",
      });

      const cuerpo = titulo.parentElement;

      expect(
        cuerpo.classList.contains("text-center")
      ).toBe(true);

      const contenedorIcono =
        cuerpo.querySelector("svg").parentElement;

      expect(
        contenedorIcono.classList.contains("d-flex")
      ).toBe(true);

      expect(
        contenedorIcono.classList.contains(
          "justify-content-center"
        )
      ).toBe(true);
    });

    it("el error del servidor se muestra como alerta de error", async () => {
      vi.spyOn(api, "post").mockRejectedValue(
        errorAxios(500, "Falla del servidor")
      );

      await abrirFormulario();
      completarDatos();

      fireEvent.click(botonEnviar());

      const alerta = await screen.findByRole("alert");

      expect(
        alerta.classList.contains("alert-danger")
      ).toBe(true);

      expect(alerta.textContent).toBe(
        "Falla del servidor"
      );
    });
  });
});
