// SolicitudFormulario (crear y editar) y la página NuevaSolicitud que lo usa.
import { render, screen, fireEvent } from "@testing-library/react";
import api from "../services/api";
import SolicitudFormulario from "../components/SolicitudFormulario";
import NuevaSolicitud from "../pages/NuevaSolicitud";
import { renderizar, simularGet, errorAxios, archivoDePrueba, elegirArchivo, esperarQue } from "./ayudantes";

const FAMILIAS = [
  { _id: "fam-ventas", nombre: "Ventas" },
  { _id: "fam-admin", nombre: "Administración" },
];
const EVALUADORES = [
  { _id: "u-eva", nombre: "Eva Evaluadora" },
  { _id: "u-otto", nombre: "Otto Evaluador" },
];
const DATOS_BASE = { "/familias": FAMILIAS, "/usuarios": EVALUADORES };
const MENSAJE_TELEFONO = "Ingresa un celular chileno válido: +56 9 1234 5678";

function completarCandidato({ telefono = "+56 9 1234 5678" } = {}) {
  fireEvent.change(screen.getByLabelText("Nombre del candidato"), { target: { value: "Diego Pérez" } });
  fireEvent.change(screen.getByLabelText("Correo del candidato"), { target: { value: "diego@ejemplo.cl" } });
  fireEvent.change(screen.getByLabelText("Teléfono del candidato"), { target: { value: telefono } });
  fireEvent.change(screen.getByLabelText("Cargo"), { target: { value: "Contador" } });
}

describe("SolicitudFormulario (nueva solicitud)", () => {
  it("carga familias y evaluadores, y deja seleccionado el primero de cada uno", async () => {
    const get = simularGet(DATOS_BASE);

    render(<SolicitudFormulario alGuardar={() => {}} />);

    expect(await screen.findByRole("heading", { name: "Nueva solicitud" })).toBeTruthy();
    expect(get).toHaveBeenCalledWith("/familias");
    expect(get).toHaveBeenCalledWith("/usuarios", { params: { rol: "evaluador" } });
    expect(screen.getByLabelText("Familia de cargo").value).toBe("fam-ventas");
    expect(screen.getByLabelText("Profesional responsable (evaluador)").value).toBe("u-eva");
  });

  it("valida el teléfono chileno y deshabilita el envío si es inválido", async () => {
    simularGet(DATOS_BASE);
    render(<SolicitudFormulario alGuardar={() => {}} />);
    await screen.findByRole("heading", { name: "Nueva solicitud" });

    completarCandidato({ telefono: "123" });

    expect(screen.getByText(MENSAJE_TELEFONO)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear solicitud" }).disabled).toBe(true);
  });

  it("envía los datos con FormData (incluido el CV) y avisa al padre con el resultado", async () => {
    // Arrange
    simularGet(DATOS_BASE);
    const creada = { _id: "s-nueva" };
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: creada });
    const alGuardar = vi.fn();
    render(<SolicitudFormulario alGuardar={alGuardar} />);
    await screen.findByRole("heading", { name: "Nueva solicitud" });
    completarCandidato();
    fireEvent.change(screen.getByLabelText("Familia de cargo"), { target: { value: "fam-admin" } });
    fireEvent.change(screen.getByLabelText("Profesional responsable (evaluador)"), { target: { value: "u-otto" } });
    fireEvent.change(screen.getByLabelText("Observaciones"), { target: { value: "Urgente" } });
    elegirArchivo(document.querySelector('input[type="file"]'), archivoDePrueba("cv-diego.pdf", "application/pdf"));

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    // Assert
    await esperarQue(() => alGuardar.mock.calls.length > 0, "que se avise al padre");
    expect(alGuardar).toHaveBeenCalledExactlyOnceWith(creada);
    const [ruta, formData] = post.mock.lastCall;
    expect(ruta).toBe("/solicitudes");
    expect(formData.get("candidatoNombre")).toBe("Diego Pérez");
    expect(formData.get("candidatoCorreo")).toBe("diego@ejemplo.cl");
    expect(formData.get("familiaDeCargo")).toBe("fam-admin");
    expect(formData.get("profesionalResponsable")).toBe("u-otto");
    expect(formData.get("observaciones")).toBe("Urgente");
    expect(formData.get("cv").name).toBe("cv-diego.pdf");
  });

  it("muestra el error del servidor y no avisa al padre", async () => {
    simularGet(DATOS_BASE);
    vi.spyOn(api, "post").mockRejectedValue(errorAxios(400, "Datos del candidato inválidos"));
    const alGuardar = vi.fn();
    render(<SolicitudFormulario alGuardar={alGuardar} />);
    await screen.findByRole("heading", { name: "Nueva solicitud" });
    completarCandidato();

    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    expect(await screen.findByText("Datos del candidato inválidos")).toBeTruthy();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it("sin familias ni evaluadores avisa qué falta y no permite crear", async () => {
    simularGet({ "/familias": [], "/usuarios": [] });

    render(<SolicitudFormulario alGuardar={() => {}} />);

    expect(await screen.findByText("No hay familias de cargo cargadas. Ejecuta el seed del backend.")).toBeTruthy();
    expect(screen.getByText(/No hay usuarios con rol "evaluador"/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear solicitud" }).disabled).toBe(true);
  });

  it("si no puede cargar los datos base, lo informa", async () => {
    simularGet({ "/familias": errorAxios(500, "Error"), "/usuarios": EVALUADORES });

    render(<SolicitudFormulario alGuardar={() => {}} />);

    expect(await screen.findByText("No se pudieron cargar las familias de cargo o los evaluadores")).toBeTruthy();
  });
});

describe("SolicitudFormulario (edición)", () => {
  const SOLICITUD = {
    _id: "s1",
    cargo: "Vendedor",
    observaciones: "Prioridad alta",
    candidato: {
      nombre: "Lucía Peña",
      correo: "lucia@ejemplo.cl",
      telefono: "+56 9 8765 4321",
      cvArchivoId: { _id: "a-cv", nombreOriginal: "CV Lucía.pdf" },
    },
    familiaDeCargo: { _id: "fam-ventas", nombre: "Ventas" },
    profesionalResponsable: null,
  };

  it("precarga los datos, pide elegir evaluador y muestra el CV actual", async () => {
    simularGet(DATOS_BASE);

    render(<SolicitudFormulario solicitud={SOLICITUD} alGuardar={() => {}} alCancelar={() => {}} />);

    expect(await screen.findByRole("heading", { name: "Editar solicitud" })).toBeTruthy();
    expect(screen.getByLabelText("Nombre del candidato").value).toBe("Lucía Peña");
    expect(screen.getByLabelText("Cargo").value).toBe("Vendedor");
    expect(screen.getByLabelText("Profesional responsable (evaluador)").value).toBe("");
    expect(screen.getByRole("option", { name: "Selecciona un evaluador" }).disabled).toBe(true);
    expect(screen.getByText("CV actual")).toBeTruthy();
    expect(screen.getByText("CV Lucía.pdf")).toBeTruthy();
  });

  it("al guardar hace PUT /solicitudes/:id con el evaluador asignado", async () => {
    simularGet(DATOS_BASE);
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: { ...SOLICITUD, profesionalResponsable: EVALUADORES[0] } });
    const alGuardar = vi.fn();
    render(<SolicitudFormulario solicitud={SOLICITUD} alGuardar={alGuardar} alCancelar={() => {}} />);
    await screen.findByRole("heading", { name: "Editar solicitud" });

    fireEvent.change(screen.getByLabelText("Profesional responsable (evaluador)"), { target: { value: "u-eva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await esperarQue(() => alGuardar.mock.calls.length > 0, "que se avise al padre");
    const [ruta, formData] = put.mock.lastCall;
    expect(ruta).toBe("/solicitudes/s1");
    expect(formData.get("profesionalResponsable")).toBe("u-eva");
    expect(formData.has("cv")).toBe(false);
    expect(alGuardar).toHaveBeenCalledTimes(1);
  });

  it("Cancelar avisa al padre sin guardar", async () => {
    simularGet(DATOS_BASE);
    const put = vi.spyOn(api, "put").mockImplementation(() => undefined);
    const alCancelar = vi.fn();
    render(<SolicitudFormulario solicitud={SOLICITUD} alGuardar={() => {}} alCancelar={alCancelar} />);
    await screen.findByRole("heading", { name: "Editar solicitud" });

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(alCancelar).toHaveBeenCalledTimes(1);
    expect(put).not.toHaveBeenCalled();
  });
});

describe("NuevaSolicitud", () => {
  it("al crear la solicitud lleva al panel", async () => {
    simularGet(DATOS_BASE);
    vi.spyOn(api, "post").mockResolvedValue({ data: { _id: "s-nueva" } });
    renderizar(<NuevaSolicitud />, {
      ruta: "/solicitudes/nueva",
      rutaDelElemento: "/solicitudes/nueva",
      rutasExtra: [{ path: "/panel", texto: "Pantalla del panel" }],
    });
    await screen.findByRole("heading", { name: "Nueva solicitud" });
    completarCandidato();

    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    expect(await screen.findByText("Pantalla del panel")).toBeTruthy();
  });
});

describe("SolicitudFormulario: validación visible y estados de envío", () => {
  async function abrir() {
    simularGet(DATOS_BASE);
    render(<SolicitudFormulario alGuardar={() => {}} />);
    await screen.findByRole("heading", { name: "Nueva solicitud" });
  }

  it("al enviar con campos obligatorios vacíos los marca con su mensaje y no envía nada", async () => {
    const post = vi.spyOn(api, "post");
    await abrir();

    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    for (const etiqueta of ["Nombre del candidato", "Correo del candidato", "Teléfono del candidato", "Cargo"]) {
      const campo = screen.getByLabelText(etiqueta);
      expect(campo.classList.contains("is-invalid"), etiqueta).toBe(true);
      expect(campo.nextElementSibling.classList.contains("invalid-feedback"), etiqueta).toBe(true);
      expect(campo.nextElementSibling.textContent, etiqueta).toBe("Este campo es obligatorio");
    }
    expect(post).not.toHaveBeenCalled();
  });

  it("al corregir un campo marcado se quita su mensaje", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    fireEvent.change(screen.getByLabelText("Cargo"), { target: { value: "Contador" } });

    expect(screen.getByLabelText("Cargo").classList.contains("is-invalid")).toBe(false);
    expect(screen.getByLabelText("Nombre del candidato").classList.contains("is-invalid")).toBe(true);
  });

  it("un teléfono inválido marca el campo y muestra el mensaje a su lado", async () => {
    await abrir();

    completarCandidato({ telefono: "123" });

    const telefono = screen.getByLabelText("Teléfono del candidato");
    expect(telefono.classList.contains("is-invalid")).toBe(true);
    expect(telefono.nextElementSibling.textContent).toBe(MENSAJE_TELEFONO);
  });

  it("mientras guarda, el botón queda deshabilitado con un indicador de carga", async () => {
    vi.spyOn(api, "post").mockReturnValue(new Promise(() => {}));
    await abrir();
    completarCandidato();

    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    const boton = await screen.findByRole("button", { name: "Guardando..." });
    expect(boton.disabled).toBe(true);
    expect(boton.querySelector(".spinner-border")).not.toBeNull();
  });

  it("el error del servidor se muestra como alerta de error", async () => {
    vi.spyOn(api, "post").mockRejectedValue(errorAxios(400, "Datos del candidato inválidos"));
    await abrir();
    completarCandidato();

    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.classList.contains("alert-danger")).toBe(true);
    expect(alerta.textContent).toBe("Datos del candidato inválidos");
  });

  it("muestra el nombre del CV elegido y es opcional (no se marca si se deja vacío)", async () => {
    await abrir();
    const cv = document.querySelector('input[type="file"]');
    expect(cv.required).toBe(false);

    elegirArchivo(cv, archivoDePrueba("cv-diego.pdf", "application/pdf"));

    expect(screen.getByText("cv-diego.pdf")).toBeTruthy();
    expect(cv.classList.contains("is-invalid")).toBe(false);
  });
});
