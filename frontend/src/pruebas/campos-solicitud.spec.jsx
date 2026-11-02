// Campos nuevos de la solicitud: fecha y hora de evaluación, resultado final (Aprobada o Rechazada) y
// mensaje adicional del candidato. Cubre las funciones de fechas, los servicios, el formulario público,
// el formulario interno, el detalle y el panel. El backend se reemplaza con spies sobre axios.
import { render, screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import * as solicitudService from "../services/solicitudService";
import { enviarPostulacion } from "../services/postulacionService";
import Postular from "../pages/Postular";
import Panel from "../pages/Panel";
import SolicitudDetalle from "../pages/SolicitudDetalle";
import SolicitudFormulario from "../components/SolicitudFormulario";
import { aValorDatetimeLocal, desdeValorDatetimeLocal, formatearFechaHora } from "../utils/fechas";
import { MAX_MENSAJE_ADICIONAL } from "../config/solicitud";
import {
  renderizar,
  iniciarSesionSimulada,
  limpiarSesion,
  simularGet,
  errorAxios,
  archivoDePrueba,
  elegirArchivo,
  esperarQue,
  USUARIOS,
} from "./ayudantes";

// Instante fijo en la hora local de quien corre las pruebas: así no dependen de la zona horaria.
const FECHA_LOCAL = new Date(2026, 10, 5, 10, 30);
const FECHA_ISO = FECHA_LOCAL.toISOString();
const OTRA_FECHA_ISO = new Date(2026, 10, 20, 9, 15).toISOString();

describe("utils/fechas: fecha y hora de evaluación", () => {
  it("rechaza días inexistentes en vez de moverlos a otro mes", () => {
    expect(desdeValorDatetimeLocal("2026-02-30T10:30")).toBeNull();
    expect(desdeValorDatetimeLocal("2026-04-31T10:30")).toBeNull();
  });
  it("formatearFechaHora muestra día-mes-año y hora local, y tolera datos faltantes o inválidos", () => {
    expect(formatearFechaHora(FECHA_ISO)).toBe("05-11-2026 10:30");
    expect(formatearFechaHora(new Date(2026, 0, 7, 8, 5).toISOString())).toBe("07-01-2026 08:05");
    expect(formatearFechaHora(null)).toBe("-");
    expect(formatearFechaHora(undefined)).toBe("-");
    expect(formatearFechaHora("")).toBe("-");
    expect(formatearFechaHora("no es una fecha")).toBe("-");
  });

  it("aValorDatetimeLocal entrega el valor del input en hora local", () => {
    expect(aValorDatetimeLocal(FECHA_ISO)).toBe("2026-11-05T10:30");
    expect(aValorDatetimeLocal(null)).toBe("");
    expect(aValorDatetimeLocal("basura")).toBe("");
  });

  it("desdeValorDatetimeLocal vuelve al instante en ISO, y distingue vacío de inválido", () => {
    expect(desdeValorDatetimeLocal("2026-11-05T10:30")).toBe(FECHA_ISO);
    expect(desdeValorDatetimeLocal("")).toBe("");
    expect(desdeValorDatetimeLocal("2026-99-99T10:30")).toBeNull();
    expect(desdeValorDatetimeLocal("hoy")).toBeNull();
  });

  it("ida y vuelta: lo que sale del input vuelve igual", () => {
    expect(aValorDatetimeLocal(desdeValorDatetimeLocal("2026-12-24T23:59"))).toBe("2026-12-24T23:59");
  });
});

describe("servicios con los campos nuevos", () => {
  const DATOS = {
    candidatoNombre: "Diego",
    candidatoCorreo: "diego@ejemplo.cl",
    candidatoTelefono: "+56 9 1111 2222",
    familiaDeCargo: "fam-ventas",
    cargo: "Ejecutivo de Ventas",
    profesionalResponsable: "u-eva",
  };

  it("crearSolicitud y actualizarSolicitud envían fechaEvaluacion (incluso vacía, para quitarla)", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: {} });

    await solicitudService.crearSolicitud({ ...DATOS, fechaEvaluacion: FECHA_ISO });
    await solicitudService.actualizarSolicitud("s1", { ...DATOS, fechaEvaluacion: "" });

    expect(post.mock.lastCall[1].get("fechaEvaluacion")).toBe(FECHA_ISO);
    expect(put.mock.lastCall[1].get("fechaEvaluacion")).toBe("");
  });

  it("si el dato no viene, no se envía el campo (el backend no toca la fecha guardada)", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: {} });

    await solicitudService.actualizarSolicitud("s1", DATOS);

    expect(put.mock.lastCall[1].has("fechaEvaluacion")).toBe(false);
  });

  it("null se envía como vacío para quitar la fecha en multipart", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: {} });
    await solicitudService.actualizarSolicitud("s1", { ...DATOS, fechaEvaluacion: null });
    expect(put.mock.lastCall[1].get("fechaEvaluacion")).toBe("");
  });

  it("actualizarEstadoSolicitud envía el resultado solo cuando se indica (incluido null para quitarlo)", async () => {
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: {} });

    await solicitudService.actualizarEstadoSolicitud("s1", "Finalizada");
    expect(patch).toHaveBeenLastCalledWith("/solicitudes/s1/estado", { estado: "Finalizada" });

    await solicitudService.actualizarEstadoSolicitud("s1", "Finalizada", "Aprobada");
    expect(patch).toHaveBeenLastCalledWith("/solicitudes/s1/estado", { estado: "Finalizada", resultado: "Aprobada" });

    await solicitudService.actualizarEstadoSolicitud("s1", "Finalizada", null);
    expect(patch).toHaveBeenLastCalledWith("/solicitudes/s1/estado", { estado: "Finalizada", resultado: null });
  });

  it("enviarPostulacion envía el mensaje adicional (vacío si no se escribió)", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    const base = { nombre: "Camila", correo: "c@ejemplo.cl", telefono: "+56 9 1234 5678", familiaDeCargo: "f", cargo: "c", cv: archivoDePrueba("cv.pdf", "application/pdf") };

    await enviarPostulacion({ ...base, mensajeAdicional: "Me interesa mucho" });
    expect(post.mock.lastCall[1].get("mensajeAdicional")).toBe("Me interesa mucho");

    await enviarPostulacion(base);
    expect(post.mock.lastCall[1].get("mensajeAdicional")).toBe("");
  });
});

describe("Postular: mensaje adicional", () => {
  const FAMILIAS = [
    { _id: "fam-ventas", nombre: "Ventas" },
    { _id: "fam-operaciones", nombre: "Operaciones" },
  ];

  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ data: FAMILIAS });
  });

  async function abrir() {
    renderizar(<Postular />, { ruta: "/postular", rutaDelElemento: "/postular" });
    await screen.findByRole("option", { name: "Ventas" });
  }

  function completarDatos() {
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Camila Muñoz" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "camila@ejemplo.cl" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "+56 9 1234 5678" } });
    fireEvent.change(screen.getByLabelText("Área de interés"), { target: { value: "fam-ventas" } });
    fireEvent.change(screen.getByLabelText("Cargo al que postulas"), { target: { value: "Ejecutivo de Ventas" } });
    elegirArchivo(document.querySelector('input[type="file"]'), archivoDePrueba("cv.pdf", "application/pdf"));
  }

  const campo = () => screen.getByLabelText("Mensaje adicional (opcional)");
  const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Enviar postulación" }));

  it("muestra el campo opcional con su ayuda, el límite de 800 y un contador", async () => {
    await abrir();

    expect(campo().tagName).toBe("TEXTAREA");
    expect(campo().required).toBe(false);
    expect(campo().maxLength).toBe(MAX_MENSAJE_ADICIONAL);
    const ayuda = screen.getByText(/Cuéntanos brevemente por qué te interesa este cargo/);
    expect(ayuda.closest("[id]").id).toBe(campo().getAttribute("aria-describedby"));
    expect(screen.getByText("0/800")).toBeTruthy();

    fireEvent.change(campo(), { target: { value: "Hola" } });
    expect(screen.getByText("4/800")).toBeTruthy();
  });

  it("es opcional: sin mensaje la postulación se envía igual, con el campo vacío", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { mensaje: "Postulación recibida" } });
    await abrir();
    completarDatos();

    enviar();

    expect(await screen.findByRole("heading", { name: "Postulación recibida" })).toBeTruthy();
    expect(post.mock.lastCall[1].get("mensajeAdicional")).toBe("");
  });

  it("envía el mensaje escrito (sin espacios de más al borde) junto con el resto de los datos", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { mensaje: "Postulación recibida" } });
    await abrir();
    completarDatos();
    fireEvent.change(campo(), { target: { value: "  Tengo experiencia en ventas.\nQuedo atenta.  " } });

    enviar();

    await screen.findByRole("heading", { name: "Postulación recibida" });
    const datos = post.mock.lastCall[1];
    expect(datos.get("mensajeAdicional")).toBe("Tengo experiencia en ventas.\nQuedo atenta.");
    expect(datos.get("cargo")).toBe("Ejecutivo de Ventas");
    expect(datos.get("familiaDeCargo")).toBe("fam-ventas");
    expect(datos.get("cv").name).toBe("cv.pdf");
  });

  it("acepta exactamente 800 caracteres", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { mensaje: "Postulación recibida" } });
    await abrir();
    completarDatos();
    fireEvent.change(campo(), { target: { value: "a".repeat(MAX_MENSAJE_ADICIONAL) } });

    enviar();

    await screen.findByRole("heading", { name: "Postulación recibida" });
    expect(post.mock.lastCall[1].get("mensajeAdicional").length).toBe(MAX_MENSAJE_ADICIONAL);
  });

  it("con más de 800 caracteres marca el campo, explica el límite y no envía nada", async () => {
    const post = vi.spyOn(api, "post");
    await abrir();
    completarDatos();
    fireEvent.change(campo(), { target: { value: "a".repeat(MAX_MENSAJE_ADICIONAL + 1) } });

    enviar();

    expect(campo().classList.contains("is-invalid")).toBe(true);
    expect(campo().getAttribute("aria-invalid")).toBe("true");
    const error = screen.getByText("El mensaje adicional no puede superar los 800 caracteres.");
    expect(campo().getAttribute("aria-describedby")).toContain(error.id);
    expect(post).not.toHaveBeenCalled();
  });

  it("al corregir el mensaje desaparece el error y se puede enviar", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { mensaje: "Postulación recibida" } });
    await abrir();
    completarDatos();
    fireEvent.change(campo(), { target: { value: "a".repeat(MAX_MENSAJE_ADICIONAL + 1) } });
    enviar();
    expect(campo().classList.contains("is-invalid")).toBe(true);

    fireEvent.change(campo(), { target: { value: "Mensaje corto" } });
    expect(campo().classList.contains("is-invalid")).toBe(false);
    enviar();

    await screen.findByRole("heading", { name: "Postulación recibida" });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("si el backend rechaza el mensaje, se muestra su error", async () => {
    vi.spyOn(api, "post").mockRejectedValue(errorAxios(400, "El mensaje adicional no puede superar los 800 caracteres."));
    await abrir();
    completarDatos();
    fireEvent.change(campo(), { target: { value: "Hola" } });

    enviar();

    expect((await screen.findByRole("alert")).textContent).toBe("El mensaje adicional no puede superar los 800 caracteres.");
  });
});

describe("SolicitudFormulario: fecha y hora de evaluación", () => {
  const FAMILIAS = [{ _id: "fam-operaciones", nombre: "Operaciones" }];
  const EVALUADORES = [{ _id: "u-eva", nombre: "Eva Evaluadora" }];
  const DATOS_BASE = { "/familias": FAMILIAS, "/usuarios": EVALUADORES };
  const ETIQUETA = "Fecha y hora de evaluación (opcional)";

  const SOLICITUD = {
    _id: "s1",
    cargo: "Operador de Planta",
    fechaEvaluacion: FECHA_ISO,
    candidato: { nombre: "Lucía Peña", correo: "lucia@ejemplo.cl", telefono: "+56 9 8765 4321" },
    familiaDeCargo: FAMILIAS[0],
    profesionalResponsable: EVALUADORES[0],
  };

  async function abrir(solicitud) {
    simularGet(DATOS_BASE);
    render(<SolicitudFormulario solicitud={solicitud} alGuardar={() => {}} />);
    await screen.findByRole("heading", { name: solicitud ? "Editar solicitud" : "Nueva solicitud" });
  }

  const campo = () => screen.getByLabelText(ETIQUETA);

  it("es un campo datetime-local opcional con ayuda sobre la hora local", async () => {
    await abrir(SOLICITUD);

    expect(campo().type).toBe("datetime-local");
    expect(campo().required).toBe(false);
    expect(screen.getByText(/Hora local/)).toBeTruthy();
  });

  it("al editar precarga la fecha guardada en hora local", async () => {
    await abrir(SOLICITUD);

    expect(campo().value).toBe("2026-11-05T10:30");
  });

  it("una solicitud antigua, sin fecha, muestra el campo vacío", async () => {
    await abrir({ ...SOLICITUD, fechaEvaluacion: undefined });

    expect(campo().value).toBe("");
  });

  it("al guardar un cambio de fecha envía el nuevo instante", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: SOLICITUD });
    await abrir(SOLICITUD);

    fireEvent.change(campo(), { target: { value: "2026-11-20T09:15" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await esperarQue(() => put.mock.calls.length === 1, "que se guarde");
    expect(put.mock.lastCall[1].get("fechaEvaluacion")).toBe(OTRA_FECHA_ISO);
  });

  it("al vaciar el campo envía texto vacío para quitar la fecha", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: SOLICITUD });
    await abrir(SOLICITUD);

    fireEvent.change(campo(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await esperarQue(() => put.mock.calls.length === 1, "que se guarde");
    expect(put.mock.lastCall[1].get("fechaEvaluacion")).toBe("");
  });

  it("al guardar sin tocar la fecha la conserva", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: SOLICITUD });
    await abrir(SOLICITUD);

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await esperarQue(() => put.mock.calls.length === 1, "que se guarde");
    expect(put.mock.lastCall[1].get("fechaEvaluacion")).toBe(FECHA_ISO);
  });

  it("editar otro campo preserva segundos y milisegundos de la fecha original", async () => {
    const fecha = new Date(2026, 10, 5, 10, 30, 42, 123).toISOString();
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: SOLICITUD });
    await abrir({ ...SOLICITUD, fechaEvaluacion: fecha });
    fireEvent.change(screen.getByLabelText("Nombre del candidato"), { target: { value: "Lucía Actualizada" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await esperarQue(() => put.mock.calls.length === 1, "que se guarde");
    expect(put.mock.lastCall[1].get("fechaEvaluacion")).toBe(fecha);
  });

  it("al crear una solicitud nueva sin fecha, la envía vacía", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { _id: "nueva" } });
    await abrir(undefined);
    fireEvent.change(screen.getByLabelText("Nombre del candidato"), { target: { value: "Diego Pérez" } });
    fireEvent.change(screen.getByLabelText("Correo del candidato"), { target: { value: "diego@ejemplo.cl" } });
    fireEvent.change(screen.getByLabelText("Teléfono del candidato"), { target: { value: "+56 9 1234 5678" } });
    fireEvent.change(screen.getByLabelText("Cargo"), { target: { value: "Operador de Planta" } });

    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    await esperarQue(() => post.mock.calls.length === 1, "que se cree");
    expect(post.mock.lastCall[1].get("fechaEvaluacion")).toBe("");
  });

  it("al crear con fecha, la envía como instante", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { _id: "nueva" } });
    await abrir(undefined);
    fireEvent.change(screen.getByLabelText("Nombre del candidato"), { target: { value: "Diego Pérez" } });
    fireEvent.change(screen.getByLabelText("Correo del candidato"), { target: { value: "diego@ejemplo.cl" } });
    fireEvent.change(screen.getByLabelText("Teléfono del candidato"), { target: { value: "+56 9 1234 5678" } });
    fireEvent.change(screen.getByLabelText("Cargo"), { target: { value: "Operador de Planta" } });
    fireEvent.change(campo(), { target: { value: "2026-11-05T10:30" } });

    fireEvent.click(screen.getByRole("button", { name: "Crear solicitud" }));

    await esperarQue(() => post.mock.calls.length === 1, "que se cree");
    expect(post.mock.lastCall[1].get("fechaEvaluacion")).toBe(FECHA_ISO);
  });

  it("si el backend rechaza la fecha, muestra su error", async () => {
    vi.spyOn(api, "put").mockRejectedValue(errorAxios(400, "La fecha y hora de evaluación no es válida"));
    await abrir(SOLICITUD);

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect((await screen.findByRole("alert")).textContent).toBe("La fecha y hora de evaluación no es válida");
  });
});

describe("SolicitudDetalle: fecha de evaluación, resultado final y mensaje adicional", () => {
  afterEach(() => limpiarSesion());

  const EVALUADOR_AJENO = { id: "u-otro", nombre: "Otto Ajeno", correo: "otto@ejemplo.cl", rol: "evaluador" };

  function crearSolicitud(cambios = {}) {
    return {
      _id: "s1",
      estado: "En proceso",
      cargo: "Operador de Planta",
      observaciones: "",
      candidato: {
        nombre: "Lucía Peña",
        correo: "lucia@ejemplo.cl",
        telefono: "+56 9 8765 4321",
        origen: "postulacion_publica",
        cvArchivoId: { _id: "a-cv", nombreOriginal: "CV Lucía.pdf" },
        informeArchivoId: null,
      },
      familiaDeCargo: { _id: "fam-operaciones", nombre: "Operaciones" },
      profesionalResponsable: { _id: USUARIOS.evaluador.id, nombre: "Eva Evaluadora" },
      analistaId: null,
      ...cambios,
    };
  }

  function respuestas(solicitud) {
    return {
      "/solicitudes/s1": solicitud,
      "/solicitudes/s1/evaluaciones": [],
      "/familias": [{ _id: "fam-operaciones", nombre: "Operaciones" }],
      "/usuarios": [{ _id: USUARIOS.evaluador.id, nombre: "Eva Evaluadora" }],
    };
  }

  async function abrir(usuario, solicitud = crearSolicitud()) {
    iniciarSesionSimulada(usuario);
    simularGet(respuestas(solicitud));
    renderizar(<SolicitudDetalle />, { ruta: "/solicitudes/s1", rutaDelElemento: "/solicitudes/:id" });
    await screen.findByRole("heading", { name: "Archivos del candidato" });
  }

  const datos = () => within(screen.getByRole("heading", { name: "Datos de la solicitud" }).closest("section"));
  const valorDe = (titulo) => datos().getByText(titulo).nextElementSibling;

  describe("fecha y hora de evaluación", () => {
    it("muestra la fecha y hora guardadas", async () => {
      await abrir(USUARIOS.analista, crearSolicitud({ fechaEvaluacion: FECHA_ISO }));

      expect(valorDe("Fecha y hora de evaluación").textContent).toContain("05-11-2026 10:30");
    });

    it("una solicitud antigua, sin el campo, dice que no está programada", async () => {
      await abrir(USUARIOS.analista, crearSolicitud());

      expect(valorDe("Fecha y hora de evaluación").textContent).toContain("Sin programar");
    });

    it.each([
      ["analista", USUARIOS.analista, true],
      ["admin", USUARIOS.admin, true],
      ["evaluador responsable", USUARIOS.evaluador, false],
      ["evaluador ajeno", EVALUADOR_AJENO, false],
    ])("%s: %s puede cambiar la fecha", async (_nombre, usuario, puede) => {
      await abrir(usuario, crearSolicitud({ fechaEvaluacion: FECHA_ISO }));

      expect(screen.queryByRole("button", { name: "Cambiar fecha" }) !== null).toBe(puede);
    });

    it('sin fecha el botón dice "Programar fecha"', async () => {
      await abrir(USUARIOS.analista, crearSolicitud());

      expect(screen.getByRole("button", { name: "Programar fecha" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Cambiar fecha" })).toBeNull();
    });

    it("cambiarla abre el formulario con la fecha cargada, guarda con PUT y el detalle se actualiza", async () => {
      await abrir(USUARIOS.analista, crearSolicitud({ fechaEvaluacion: FECHA_ISO }));
      const put = vi.spyOn(api, "put").mockResolvedValue({
        data: crearSolicitud({ fechaEvaluacion: OTRA_FECHA_ISO, analistaId: "sin-poblar" }),
      });

      fireEvent.click(screen.getByRole("button", { name: "Cambiar fecha" }));
      await screen.findByRole("heading", { name: "Editar solicitud" });
      const campo = screen.getByLabelText("Fecha y hora de evaluación (opcional)");
      expect(campo.value).toBe("2026-11-05T10:30");
      fireEvent.change(campo, { target: { value: "2026-11-20T09:15" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      await esperarQue(() => screen.queryByRole("dialog") === null, "que se cierre el modal");
      expect(put.mock.lastCall[0]).toBe("/solicitudes/s1");
      expect(put.mock.lastCall[1].get("fechaEvaluacion")).toBe(OTRA_FECHA_ISO);
      expect(valorDe("Fecha y hora de evaluación").textContent).toContain("20-11-2026 09:15");
    });
  });

  describe("resultado final", () => {
    const finalizada = (cambios = {}) => crearSolicitud({ estado: "Finalizada", ...cambios });

    it("mientras la solicitud no está finalizada no se muestra ni se puede marcar", async () => {
      await abrir(USUARIOS.analista, crearSolicitud({ estado: "En proceso", resultado: null }));

      expect(datos().queryByText("Resultado final")).toBeNull();
      expect(screen.queryByRole("button", { name: /^Marcar (aprobada|rechazada)$/ })).toBeNull();
    });

    it("finalizada y sin resultado (también una solicitud antigua sin el campo) dice que está sin definir", async () => {
      await abrir(USUARIOS.analista, finalizada());

      expect(valorDe("Resultado final").textContent).toContain("Sin definir");
      expect(screen.getByRole("button", { name: "Marcar aprobada" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Marcar rechazada" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Quitar resultado" })).toBeNull();
    });

    it.each([
      ["analista", USUARIOS.analista],
      ["admin", USUARIOS.admin],
    ])("%s marca Aprobada: llama a la API y el detalle muestra el resultado", async (_nombre, usuario) => {
      await abrir(usuario, finalizada({ resultado: null }));
      const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: finalizada({ resultado: "Aprobada" }) });

      fireEvent.click(screen.getByRole("button", { name: "Marcar aprobada" }));

      await esperarQue(() => valorDe("Resultado final").textContent.includes("Aprobada"), "que se muestre el resultado");
      expect(patch).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1/estado", { estado: "Finalizada", resultado: "Aprobada" });
      // También aparece junto al estado en el encabezado, y los archivos del candidato siguen visibles.
      expect(screen.getAllByText("Aprobada").length).toBe(2);
      expect(screen.getByText("CV Lucía.pdf")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Marcar aprobada" })).toBeNull();
    });

    it("marca Rechazada y luego puede quitar el resultado", async () => {
      await abrir(USUARIOS.analista, finalizada());
      const patch = vi
        .spyOn(api, "patch")
        .mockResolvedValueOnce({ data: finalizada({ resultado: "Rechazada" }) })
        .mockResolvedValueOnce({ data: finalizada({ resultado: null }) });

      fireEvent.click(screen.getByRole("button", { name: "Marcar rechazada" }));
      await screen.findByRole("button", { name: "Quitar resultado" });
      expect(patch).toHaveBeenLastCalledWith("/solicitudes/s1/estado", { estado: "Finalizada", resultado: "Rechazada" });

      fireEvent.click(screen.getByRole("button", { name: "Quitar resultado" }));
      await esperarQue(() => valorDe("Resultado final").textContent.includes("Sin definir"), "que se quite el resultado");
      expect(patch).toHaveBeenLastCalledWith("/solicitudes/s1/estado", { estado: "Finalizada", resultado: null });
    });

    it("con un resultado ya marcado se ofrece cambiarlo al otro valor, no repetir el mismo", async () => {
      await abrir(USUARIOS.analista, finalizada({ resultado: "Aprobada" }));

      expect(screen.queryByRole("button", { name: "Marcar aprobada" })).toBeNull();
      expect(screen.getByRole("button", { name: "Marcar rechazada" })).toBeTruthy();
    });

    it("si el backend rechaza el cambio, muestra la alerta y conserva lo que había", async () => {
      await abrir(USUARIOS.analista, finalizada());
      vi.spyOn(api, "patch").mockRejectedValue(errorAxios(400, "El resultado solo se puede registrar en solicitudes finalizadas."));

      fireEvent.click(screen.getByRole("button", { name: "Marcar aprobada" }));

      const alerta = await screen.findByRole("alert");
      expect(alerta.classList.contains("alert-danger")).toBe(true);
      expect(alerta.textContent).toBe("El resultado solo se puede registrar en solicitudes finalizadas.");
      expect(valorDe("Resultado final").textContent).toContain("Sin definir");
    });

    it("mientras guarda, los botones quedan deshabilitados", async () => {
      await abrir(USUARIOS.analista, finalizada());
      vi.spyOn(api, "patch").mockReturnValue(new Promise(() => {}));

      fireEvent.click(screen.getByRole("button", { name: "Marcar aprobada" }));

      await esperarQue(() => screen.getByRole("button", { name: "Marcar rechazada" }).disabled, "que se deshabilite");
      expect(screen.getByRole("button", { name: "Marcar aprobada" }).disabled).toBe(true);
    });

    it.each([
      ["evaluador responsable", USUARIOS.evaluador],
      ["evaluador ajeno", EVALUADOR_AJENO],
    ])("%s ve el resultado pero no puede cambiarlo", async (_nombre, usuario) => {
      await abrir(usuario, finalizada({ resultado: "Rechazada" }));

      expect(valorDe("Resultado final").textContent).toContain("Rechazada");
      expect(screen.queryByRole("button", { name: /^Marcar (aprobada|rechazada)$/ })).toBeNull();
      expect(screen.queryByRole("button", { name: "Quitar resultado" })).toBeNull();
    });

    it("el encabezado no muestra un resultado guardado si la solicitud ya no está finalizada", async () => {
      await abrir(USUARIOS.analista, crearSolicitud({ estado: "En proceso", resultado: "Aprobada" }));

      expect(screen.queryByText("Aprobada")).toBeNull();
    });
  });

  describe("mensaje adicional del candidato", () => {
    it("lo muestra completo, respetando los saltos de línea", async () => {
      await abrir(USUARIOS.analista, crearSolicitud({ mensajeAdicional: "Tengo experiencia en planta.\nQuedo atenta." }));

      const valor = valorDe("Mensaje adicional del candidato");
      expect(valor.textContent).toBe("Tengo experiencia en planta.\nQuedo atenta.");
      expect(valor.style.whiteSpace).toBe("pre-wrap");
    });

    it("sin mensaje (vacío o postulación antigua sin el campo) no muestra la sección", async () => {
      await abrir(USUARIOS.analista, crearSolicitud({ mensajeAdicional: "" }));
      expect(datos().queryByText("Mensaje adicional del candidato")).toBeNull();
    });

    it("una solicitud antigua sin ninguno de los campos nuevos se ve completa y sin errores", async () => {
      await abrir(USUARIOS.analista, crearSolicitud());

      expect(screen.getByRole("heading", { name: "Lucía Peña" })).toBeTruthy();
      expect(datos().queryByText("Mensaje adicional del candidato")).toBeNull();
      expect(datos().queryByText("Resultado final")).toBeNull();
      expect(valorDe("Fecha y hora de evaluación").textContent).toContain("Sin programar");
    });
  });
});

describe("Panel: fecha de evaluación y resultado final", () => {
  afterEach(() => limpiarSesion());

  function solicitud({ id, nombre, estado = "Pendiente", ...resto }) {
    return {
      _id: id,
      estado,
      cargo: "Operador de Planta",
      candidato: { nombre, origen: "analista" },
      familiaDeCargo: { nombre: "Operaciones" },
      profesionalResponsable: { _id: "u-eva", nombre: "Eva Evaluadora" },
      ...resto,
    };
  }

  async function abrir(solicitudes) {
    iniciarSesionSimulada(USUARIOS.analista);
    vi.spyOn(api, "get").mockResolvedValue({ data: solicitudes });
    renderizar(<Panel />, { ruta: "/panel", rutaDelElemento: "/panel" });
    await screen.findByText("Panel de solicitudes");
  }

  const tarjeta = (nombre) => within(screen.getByRole("link", { name: nombre }).closest("div.shadow-sm"));

  it("muestra la fecha y hora de evaluación de forma compacta cuando existe", async () => {
    await abrir([solicitud({ id: "a", nombre: "Ana Con Fecha", fechaEvaluacion: FECHA_ISO })]);

    const parrafo = tarjeta("Ana Con Fecha").getByText("Evaluación:").parentElement;
    expect(parrafo.textContent).toContain("05-11-2026 10:30");
  });

  it("sin fecha (también las solicitudes antiguas) no muestra la línea", async () => {
    await abrir([solicitud({ id: "a", nombre: "Ana Sin Fecha" }), solicitud({ id: "b", nombre: "Beto Nulo", fechaEvaluacion: null })]);

    expect(screen.queryByText("Evaluación:")).toBeNull();
  });

  it("las finalizadas con resultado muestran su badge", async () => {
    await abrir([
      solicitud({ id: "a", nombre: "Ana Aprobada", estado: "Finalizada", resultado: "Aprobada" }),
      solicitud({ id: "b", nombre: "Beto Rechazado", estado: "Finalizada", resultado: "Rechazada" }),
    ]);

    expect(tarjeta("Ana Aprobada").getByText("Aprobada").classList.contains("badge")).toBe(true);
    expect(tarjeta("Beto Rechazado").getByText("Rechazada").classList.contains("badge")).toBe(true);
  });

  it("una finalizada antigua, sin resultado, no muestra ningún badge de resultado", async () => {
    await abrir([solicitud({ id: "a", nombre: "Ana Antigua", estado: "Finalizada" })]);

    expect(tarjeta("Ana Antigua").queryByText(/^(Aprobada|Rechazada)$/)).toBeNull();
  });

  it("el resultado solo se muestra en la columna Finalizada", async () => {
    await abrir([solicitud({ id: "a", nombre: "Ana En Proceso", estado: "En proceso", resultado: "Aprobada" })]);

    expect(screen.queryByText("Aprobada")).toBeNull();
  });
});
