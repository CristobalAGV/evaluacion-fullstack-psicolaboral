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
    expect(screen.getByRole("button", { name: "Crear solicitud" }).disabled).toBeTrue();
  });

  it("envía los datos con FormData (incluido el CV) y avisa al padre con el resultado", async () => {
    // Arrange
    simularGet(DATOS_BASE);
    const creada = { _id: "s-nueva" };
    const post = spyOn(api, "post").and.resolveTo({ data: creada });
    const alGuardar = jasmine.createSpy("alGuardar");
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
    await esperarQue(() => alGuardar.calls.count() > 0, "que se avise al padre");
    expect(alGuardar).toHaveBeenCalledOnceWith(creada);
    const [ruta, formData] = post.calls.mostRecent().args;
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
    spyOn(api, "post").and.rejectWith(errorAxios(400, "Datos del candidato inválidos"));
    const alGuardar = jasmine.createSpy("alGuardar");
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
    expect(screen.getByRole("button", { name: "Crear solicitud" }).disabled).toBeTrue();
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
    expect(screen.getByRole("option", { name: "Selecciona un evaluador" }).disabled).toBeTrue();
    expect(screen.getByText("CV actual")).toBeTruthy();
    expect(screen.getByText("CV Lucía.pdf")).toBeTruthy();
  });

  it("al guardar hace PUT /solicitudes/:id con el evaluador asignado", async () => {
    simularGet(DATOS_BASE);
    const put = spyOn(api, "put").and.resolveTo({ data: { ...SOLICITUD, profesionalResponsable: EVALUADORES[0] } });
    const alGuardar = jasmine.createSpy("alGuardar");
    render(<SolicitudFormulario solicitud={SOLICITUD} alGuardar={alGuardar} alCancelar={() => {}} />);
    await screen.findByRole("heading", { name: "Editar solicitud" });

    fireEvent.change(screen.getByLabelText("Profesional responsable (evaluador)"), { target: { value: "u-eva" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await esperarQue(() => alGuardar.calls.count() > 0, "que se avise al padre");
    const [ruta, formData] = put.calls.mostRecent().args;
    expect(ruta).toBe("/solicitudes/s1");
    expect(formData.get("profesionalResponsable")).toBe("u-eva");
    expect(formData.has("cv")).toBeFalse();
    expect(alGuardar).toHaveBeenCalledTimes(1);
  });

  it("Cancelar avisa al padre sin guardar", async () => {
    simularGet(DATOS_BASE);
    const put = spyOn(api, "put");
    const alCancelar = jasmine.createSpy("alCancelar");
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
    spyOn(api, "post").and.resolveTo({ data: { _id: "s-nueva" } });
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
