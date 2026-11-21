vi.mock("../config/funcionalidades", () => ({ IA_HABILITADA: true }));
// SolicitudDetalle: datos, archivos del candidato, permisos por rol, evaluaciones e informe.
import { screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import SolicitudDetalle from "../pages/SolicitudDetalle";
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

const WORD = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const EVALUADOR_AJENO = { id: "u-otro", nombre: "Otto Ajeno", correo: "otto@ejemplo.cl", rol: "evaluador" };

function crearSolicitud(cambios = {}) {
  return {
    _id: "s1",
    estado: "En proceso",
    cargo: "Ejecutiva de ventas",
    observaciones: "Postula a la sucursal norte",
    candidato: {
      nombre: "Lucía Peña",
      correo: "lucia@ejemplo.cl",
      telefono: "+56 9 8765 4321",
      origen: "postulacion_publica",
      cvArchivoId: { _id: "a-cv", nombreOriginal: "CV Lucía.pdf" },
      informeArchivoId: null,
      // Informe antiguo guardado en disco: ya no existe
      informeEntrevistaUrl: "/uploads/1788550049999-informe_viejo.docx",
    },
    familiaDeCargo: { _id: "fam-ventas", nombre: "Ventas" },
    profesionalResponsable: { _id: USUARIOS.evaluador.id, nombre: "Eva Evaluadora" },
    analistaId: null,
    ...cambios,
  };
}

const EVALUACIONES = [
  { _id: "e1", fechaEvaluacion: "2026-10-05T00:00:00.000Z", estado: "Pendiente", resultado: "Primera entrevista" },
];

function crearExpediente(solicitud) {
  const { candidato, familiaDeCargo, estado, _id } = solicitud;
  return {
    solicitudId: _id, candidato: { _id: "candidato-s1", nombre: candidato.nombre },
    carpeta: "postulantes/lucia-pena-candidato-s1", familia: familiaDeCargo, estado,
    documentos: { cv: candidato.cvArchivoId, informe: candidato.informeArchivoId, pauta: true },
  };
}

async function abrirDetalle(usuario, {
  solicitud = crearSolicitud(), evaluaciones = EVALUACIONES, expediente = crearExpediente(solicitud), informe = null, evaluacionIa = null,
} = {}) {
  iniciarSesionSimulada(usuario);
  const get = simularGet({
    "/solicitudes/s1": solicitud,
    "/solicitudes/s1/carpeta": expediente,
    "/solicitudes/s1/evaluaciones": evaluaciones,
    "/solicitudes/s1/informe": informe,
    "/solicitudes/s1/informe/evaluacion": evaluacionIa,
    "/familias": [{ _id: "fam-ventas", nombre: "Ventas" }],
    "/usuarios": [
      { _id: USUARIOS.evaluador.id, nombre: "Eva Evaluadora" },
      { _id: "u-otto", nombre: "Otto Evaluador" },
    ],
  });
  renderizar(<SolicitudDetalle />, { ruta: "/solicitudes/s1", rutaDelElemento: "/solicitudes/:id" });
  await screen.findByRole("heading", { name: "Datos de la solicitud" });
  // Las tarjetas de IA cargan sus datos aparte: se espera a que terminen para que ningún cambio de
  // estado ocurra fuera de la prueba (eso es lo que React avisa con "not wrapped in act").
  await esperarQue(
    () => !screen.queryByText("Cargando informe...") && !screen.queryByText("Cargando evaluación...") &&
      !screen.queryByText("Cargando expediente…"),
    "que terminen de cargar el informe y la evaluación de IA"
  );
  return get;
}

const fila = (etiqueta) => screen.getByText(etiqueta, { exact: true }).closest("div.border.rounded");
const subirInformeVisible = () => screen.queryByText(/^(Subir|Reemplazar) informe de entrevista$/) !== null;

describe("SolicitudDetalle", () => {
  afterEach(() => limpiarSesion());

  it.each([USUARIOS.admin, USUARIOS.evaluador])("muestra los antecedentes de Finalizada en solo lectura para $rol", async (usuario) => {
    await abrirDetalle(usuario, {
      solicitud: crearSolicitud({ estado: "Finalizada", resultado: "Aprobada" }),
      informe: { secciones: [{ titulo: "Síntesis", contenido: "Informe guardado de prueba" }] },
      evaluacionIa: {
        puntajeGlobal: 82, competencias: [{ nombre: "Logística", puntaje: 77, justificacion: "Evidencia de prueba" }],
        fortalezas: ["Fortaleza publicada de prueba"], areasDeMejora: ["Aspecto por desarrollar"],
        recomendaciones: ["Recomendación de prueba"], resumen: "Resumen guardado de apoyo",
      },
    });

    expect(screen.getByText("Proceso finalizado. La evaluación y sus antecedentes se muestran en modo de solo lectura.")).toBeTruthy();
    for (const texto of [
      "Informe guardado de prueba", "Resumen guardado de apoyo", "Logística", "Fortaleza publicada de prueba",
      "Aspecto por desarrollar", "Recomendación de prueba", "Primera entrevista",
    ]) expect(screen.getByText(texto)).toBeTruthy();
    expect(screen.getByLabelText("Nota global: 82 de 100")).toBeTruthy();
    expect(screen.getAllByText("Aprobada").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Expediente del postulante" })).toBeTruthy();
    expect(within(fila("CV")).getByRole("button", { name: "Descargar" })).toBeTruthy();
    for (const nombre of [/Sugerir preguntas/i, /Generar|Volver a generar/i, /Nueva evaluación/i, /^Editar$/, /Confirmar y guardar/i]) {
      expect(screen.queryByRole("button", { name: nombre })).toBeNull();
    }
  });

  describe("datos y archivos", () => {
    it("muestra los datos del candidato y de la solicitud", async () => {
      await abrirDetalle(USUARIOS.analista);

      expect(screen.getByRole("heading", { name: "Lucía Peña" })).toBeTruthy();
      expect(screen.getByText("Postulación pública")).toBeTruthy();
      expect(screen.getByText("lucia@ejemplo.cl")).toBeTruthy();
      expect(screen.getByText("+56 9 8765 4321")).toBeTruthy();
      expect(screen.getByText("Ejecutiva de ventas")).toBeTruthy();
      expect(within(screen.getByRole("heading", { name: "Datos de la solicitud" }).closest("section")).getByText("Ventas")).toBeTruthy();
      expect(screen.getByText("Eva Evaluadora")).toBeTruthy();
      expect(screen.getByText("Postulación pública del candidato")).toBeTruthy();
      expect(screen.getByText("Postula a la sucursal norte")).toBeTruthy();
    });

    it('muestra el expediente y sus metadatos, el CV disponible y el informe faltante', async () => {
      await abrirDetalle(USUARIOS.analista);

      const expediente = within(screen.getByRole("heading", { name: "Expediente del postulante" }).closest("section"));
      for (const valor of ["Lucía Peña", "candidato-s1", "s1", "postulantes/lucia-pena-candidato-s1", "En proceso"]) {
        expect(expediente.getByText(valor, { exact: true })).toBeTruthy();
      }
      expect(within(fila("CV")).getByText("CV Lucía.pdf")).toBeTruthy();
      expect(within(fila("CV")).getByRole("button", { name: "Descargar" })).toBeTruthy();
      expect(within(fila("Informe de entrevista")).getByText("No disponible")).toBeTruthy();
      expect(within(fila("Informe de entrevista")).queryByRole("button", { name: "Descargar" })).toBeNull();
    });

    it("mantiene la solicitud y la carga si falla el endpoint del expediente", async () => {
      const mensaje = "No se pudo consultar el expediente de la solicitud";
      await abrirDetalle(USUARIOS.analista, { expediente: errorAxios(500, mensaje) });
      expect((await screen.findByRole("alert")).textContent).toBe(mensaje);
      expect(screen.getByRole("heading", { name: "Lucía Peña" })).toBeTruthy();
      expect(subirInformeVisible()).toBe(true);
      expect(screen.queryByRole("button", { name: "Descargar" })).toBeNull();
    });

    it("descarga los adjuntos del expediente usando sus IDs privados", async () => {
      const solicitud = crearSolicitud();
      const expediente = crearExpediente(solicitud);
      expediente.oferta = { _id: "oferta-s1", cargo: "Vacante de prueba" };
      expediente.documentos.informe = { _id: "nuevo-informe", nombreOriginal: "Entrevista.docx" };
      await abrirDetalle(USUARIOS.analista, { solicitud, expediente });
      expect(screen.getByRole("link", { name: "Vacante de prueba" }).getAttribute("href")).toBe("/gestion/ofertas/oferta-s1");
      expect(within(fila("Informe de entrevista")).getByText("Entrevista.docx")).toBeTruthy();
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: new Blob(), headers: {} });
      get.mockClear();
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:expediente");
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      fireEvent.click(within(fila("CV")).getByRole("button", { name: "Descargar" }));
      fireEvent.click(within(fila("Informe de entrevista")).getByRole("button", { name: "Descargar" }));
      await esperarQue(() => get.mock.calls.length === 2);
      expect(get.mock.calls).toEqual([
        ["/archivos/a-cv", { responseType: "blob" }], ["/archivos/nuevo-informe", { responseType: "blob" }],
      ]);
    });

    it("muestra No disponible para la pauta y el contenedor faltantes", async () => {
      const expediente = crearExpediente(crearSolicitud());
      expediente.carpeta = null;
      expediente.documentos.pauta = false;
      await abrirDetalle(USUARIOS.admin, { expediente });
      const pauta = within(fila("Pauta de entrevista · Ventas"));
      expect(pauta.getByText("No disponible")).toBeTruthy();
      expect(pauta.queryByRole("button")).toBeNull();
    });

    it("lista las evaluaciones con la fecha de calendario correcta", async () => {
      await abrirDetalle(USUARIOS.analista);

      expect(screen.getByText("05-10-2026")).toBeTruthy();
      expect(screen.getByText("Primera entrevista")).toBeTruthy();
    });

    it("sin evaluaciones ni evaluador lo indica", async () => {
      await abrirDetalle(USUARIOS.analista, {
        solicitud: crearSolicitud({ profesionalResponsable: null }),
        evaluaciones: [],
      });

      expect(screen.getByText("Todavía no hay evaluaciones registradas.")).toBeTruthy();
      expect(screen.getByText("Sin evaluador asignado")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Asignar" })).toBeTruthy();
    });

    it("si la solicitud no se puede cargar, muestra el error", async () => {
      iniciarSesionSimulada(USUARIOS.analista);
      simularGet({ "/solicitudes/s1": errorAxios(404, "Solicitud no encontrada"), "/solicitudes/s1/evaluaciones": [] });

      renderizar(<SolicitudDetalle />, { ruta: "/solicitudes/s1", rutaDelElemento: "/solicitudes/:id" });

      expect(await screen.findByText("Solicitud no encontrada")).toBeTruthy();
    });
  });

  describe("informe y evaluación con IA según el rol", () => {
    // Espera a que carguen las dos tarjetas de IA de la sección "Informe psicolaboral".
    async function abrirSeccionIa(usuario, opciones) {
      await abrirDetalle(usuario, opciones);
      await screen.findByRole("heading", { name: "Evaluación de apoyo con IA" });
      await esperarQue(() => !screen.queryByText("Cargando evaluación..."), "que cargue la evaluación");
    }

    const botonesIa = () => ({
      borrador: screen.queryByRole("button", { name: "Generar borrador con IA" }),
      evaluacion: screen.queryByRole("button", { name: "Generar evaluación con IA" }),
    });

    for (const [nombre, usuario] of [
      ["evaluador responsable", USUARIOS.evaluador],
      ["admin", USUARIOS.admin],
    ]) {
      it(`${nombre}: ve los botones de IA`, async () => {
        await abrirSeccionIa(usuario);

        expect(botonesIa().borrador).toBeTruthy();
        expect(botonesIa().evaluacion).toBeTruthy();
        expect(screen.getByText(/Apoyo generado por IA; la decisión final es del evaluador/)).toBeTruthy();
      });
    }

    for (const [nombre, usuario] of [
      ["analista", USUARIOS.analista],
      ["evaluador ajeno", EVALUADOR_AJENO],
    ]) {
      it(`${nombre}: no ve los botones de IA`, async () => {
        await abrirSeccionIa(usuario);

        expect(botonesIa().borrador).toBeNull();
        expect(botonesIa().evaluacion).toBeNull();
      });
    }

    it("sin informe de entrevista (Word) la evaluación con nota queda deshabilitada", async () => {
      // La solicitud de prueba tiene CV pero no informe de entrevista
      await abrirSeccionIa(USUARIOS.evaluador);

      expect(botonesIa().evaluacion.disabled).toBe(true);
      expect(screen.getByText(/debe tener cargados el CV y el informe de entrevista/)).toBeTruthy();
    });

    it("con CV e informe de entrevista la evaluación con nota se puede generar", async () => {
      const solicitud = crearSolicitud();
      solicitud.candidato = { ...solicitud.candidato, informeArchivoId: { _id: "a-inf", nombreOriginal: "Informe.docx" } };

      await abrirSeccionIa(USUARIOS.evaluador, { solicitud });

      expect(botonesIa().evaluacion.disabled).toBe(false);
    });
  });

  describe("botones según el rol", () => {
    it("analista: puede cambiar el evaluador y subir el informe, pero no gestiona evaluaciones", async () => {
      await abrirDetalle(USUARIOS.analista);

      expect(screen.getByRole("button", { name: "Cambiar" })).toBeTruthy();
      expect(subirInformeVisible()).toBe(true);
      expect(screen.queryByRole("button", { name: "+ Nueva evaluación" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    });

    it("evaluador responsable: gestiona evaluaciones y sube el informe, pero no reasigna", async () => {
      await abrirDetalle(USUARIOS.evaluador);

      expect(screen.getByRole("button", { name: "+ Nueva evaluación" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
      expect(subirInformeVisible()).toBe(true);
      expect(screen.queryByRole("button", { name: "Cambiar" })).toBeNull();
    });

    it("evaluador ajeno: el detalle simulado no muestra acciones ni descargas", async () => {
      await abrirDetalle(EVALUADOR_AJENO);

      expect(screen.queryByRole("button", { name: "+ Nueva evaluación" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
      expect(subirInformeVisible()).toBe(false);
      expect(screen.queryByRole("button", { name: "Cambiar" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Descargar" })).toBeNull();
    });

    it("admin: puede todo", async () => {
      await abrirDetalle(USUARIOS.admin);

      expect(screen.getByRole("button", { name: "Cambiar" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "+ Nueva evaluación" })).toBeTruthy();
      expect(subirInformeVisible()).toBe(true);
    });
  });

  describe("evaluaciones", () => {
    it("el responsable crea una evaluación y aparece en la lista", async () => {
      // Arrange
      await abrirDetalle(USUARIOS.evaluador);
      const nueva = { _id: "e2", fechaEvaluacion: "2026-10-06T00:00:00.000Z", estado: "En proceso", resultado: "Segunda entrevista" };
      const post = vi.spyOn(api, "post").mockResolvedValue({ data: nueva });
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      // Act
      fireEvent.change(screen.getByLabelText("Fecha de evaluación"), { target: { value: "2026-10-06" } });
      fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "En proceso" } });
      fireEvent.change(screen.getByLabelText("Resultado / observaciones"), { target: { value: "Segunda entrevista" } });
      fireEvent.click(screen.getByRole("button", { name: "Crear evaluación" }));

      // Assert
      expect(await screen.findByText("Segunda entrevista")).toBeTruthy();
      expect(post).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1/evaluaciones", {
        fechaEvaluacion: "2026-10-06",
        resultado: "Segunda entrevista",
        estado: "En proceso",
      });
      expect(screen.getByText("06-10-2026")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Crear evaluación" })).toBeNull();
    });

    it("si el servidor rechaza la evaluación, muestra el error y mantiene el formulario", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      vi.spyOn(api, "post").mockRejectedValue(errorAxios(403, "Solo el evaluador responsable puede gestionar sus evaluaciones"));
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      fireEvent.click(screen.getByRole("button", { name: "Crear evaluación" }));

      expect(await screen.findByText("Solo el evaluador responsable puede gestionar sus evaluaciones")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Crear evaluación" })).toBeTruthy();
    });

    it("cancelar la nueva evaluación cierra el formulario sin llamar a la API", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      const post = vi.spyOn(api, "post").mockImplementation(() => undefined);
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("button", { name: "Crear evaluación" })).toBeNull();
      expect(post).not.toHaveBeenCalled();
    });

    it("el responsable edita una evaluación existente", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      const put = vi.spyOn(api, "put").mockResolvedValue({ data: { ...EVALUACIONES[0], resultado: "Entrevista revisada" } });
      fireEvent.click(screen.getByRole("button", { name: "Editar" }));

      expect(screen.getByLabelText("Fecha de evaluación").value).toBe("2026-10-05");
      fireEvent.change(screen.getByLabelText("Resultado / observaciones"), { target: { value: "Entrevista revisada" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText("Entrevista revisada")).toBeTruthy();
      expect(put).toHaveBeenCalledExactlyOnceWith("/evaluaciones/e1", {
        fechaEvaluacion: "2026-10-05",
        resultado: "Entrevista revisada",
        estado: "Pendiente",
      });
    });
  });

  describe("informe de entrevista", () => {
    const inputInforme = () => document.querySelector('input[type="file"][accept=".doc,.docx"]');

    it("muestra Ventas y descarga la pauta por la API con el nombre recibido", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      const contenido = new Blob(["pauta ficticia"], { type: WORD });
      const nombre = "Pauta_Entrevista_Ventas.docx";
      const get = vi.spyOn(api, "get").mockResolvedValue({
        data: contenido, headers: { "content-disposition": `attachment; filename="${nombre}"` },
      });
      const crearUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pauta");
      let nombreDescargado;
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
        nombreDescargado = this.download;
      });
      expect(screen.getByText("Pauta de entrevista · Ventas")).toBeTruthy();
      expect(screen.getByText("Completa esta pauta durante o después de la entrevista y vuelve a subirla en formato Word.")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Descargar pauta de entrevista" }));
      await esperarQue(() => nombreDescargado === nombre, "que se descargue la pauta con su nombre");
      expect(get).toHaveBeenLastCalledWith("/solicitudes/s1/pauta-entrevista", { responseType: "blob" });
      expect(crearUrl).toHaveBeenCalledWith(contenido);
    });

    it("no muestra el botón a un evaluador ajeno", async () => {
      const get = await abrirDetalle(EVALUADOR_AJENO);
      expect(screen.queryByRole("heading", { name: "Expediente del postulante" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Descargar pauta de entrevista" })).toBeNull();
      expect(get.mock.calls.some(([ruta]) => ruta.endsWith("/carpeta"))).toBe(false);
    });

    it("muestra el error de descarga y permite reintentar sin afectar la carga", async () => {
      await abrirDetalle(USUARIOS.analista);
      const mensaje = "La familia de cargo no tiene una pauta de entrevista disponible";
      vi.spyOn(api, "get").mockRejectedValue({ response: {
        status: 404, data: new Blob([JSON.stringify({ mensaje })], { type: "application/json" }),
      } });
      fireEvent.click(screen.getByRole("button", { name: "Descargar pauta de entrevista" }));
      expect((await screen.findByRole("alert")).textContent).toBe(mensaje);
      expect(screen.getByRole("button", { name: "Descargar pauta de entrevista" }).disabled).toBe(false);
      expect(inputInforme()).toBeTruthy();
    });

    it("rechaza un archivo que no es Word", async () => {
      await abrirDetalle(USUARIOS.evaluador);

      elegirArchivo(inputInforme(), archivoDePrueba("informe.pdf", "application/pdf"));

      expect(screen.getByText("El informe debe ser un archivo Word (DOC o DOCX).")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Guardar informe" }).disabled).toBe(true);
    });

    it("rechaza un Word de más de 5 MB", async () => {
      await abrirDetalle(USUARIOS.evaluador);

      elegirArchivo(inputInforme(), archivoDePrueba("informe.docx", WORD, 5 * 1024 * 1024 + 1));

      expect(screen.getByText("El informe supera el tamaño máximo de 5 MB.")).toBeTruthy();
    });

    it.each([["doc", "application/msword"], ["docx", WORD]])("sube el Word .%s con PUT y lo muestra como informe actual", async (extension, tipo) => {
      // Arrange
      const expediente = crearExpediente(crearSolicitud());
      await abrirDetalle(USUARIOS.evaluador, { expediente });
      const nombre = `Informe Lucía.${extension}`;
      const put = vi.spyOn(api, "put").mockImplementation(async () => {
        expediente.documentos.informe = { _id: "a-inf", nombreOriginal: nombre };
        return { data: { informeArchivo: expediente.documentos.informe } };
      });
      elegirArchivo(inputInforme(), archivoDePrueba(nombre, tipo));

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Guardar informe" }));

      // Assert
      await esperarQue(() => Boolean(within(fila("Informe de entrevista")).queryByText(nombre)));
      expect(within(fila("Informe de entrevista")).getByRole("button", { name: "Descargar" })).toBeTruthy();
      expect(screen.getByText("Reemplazar informe de entrevista")).toBeTruthy();
      const [ruta, formData] = put.mock.lastCall;
      expect(ruta).toBe("/solicitudes/s1/informe-entrevista");
      expect(formData.get("informe").name).toBe(nombre);
    });

    it("muestra el error del servidor si rechaza el informe", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      vi.spyOn(api, "put").mockRejectedValue(errorAxios(400, "El contenido del archivo no corresponde a un Word (DOC o DOCX) válido."));
      elegirArchivo(inputInforme(), archivoDePrueba("falso.docx", WORD));

      fireEvent.click(screen.getByRole("button", { name: "Guardar informe" }));

      expect(await screen.findByText("El contenido del archivo no corresponde a un Word (DOC o DOCX) válido.")).toBeTruthy();
    });
  });

  describe("reemplazo del CV en el expediente", () => {
    const selector = () => document.querySelector('input[aria-label="Seleccionar nuevo CV"]');

    it("abre el selector, confirma y vuelve a consultar el expediente con el nuevo archivo", async () => {
      const expediente = crearExpediente(crearSolicitud());
      const get = await abrirDetalle(USUARIOS.analista, { expediente });
      const clic = vi.spyOn(selector(), "click");
      const put = vi.spyOn(api, "put").mockImplementation(async () => {
        const cvArchivo = { _id: "cv-corregido", nombreOriginal: "CV_Benjamin_Ficticio.pdf" };
        expediente.documentos.cv = cvArchivo;
        return { data: { cvArchivo } };
      });
      const cv = within(fila("CV"));
      expect(cv.getByRole("button", { name: "Descargar" })).toBeTruthy();
      fireEvent.click(cv.getByRole("button", { name: "Reemplazar CV" }));
      expect(clic).toHaveBeenCalledOnce();
      expect(selector().accept).toBe(".pdf,application/pdf");
      elegirArchivo(selector(), archivoDePrueba("CV_Benjamin_Ficticio.pdf", "application/pdf"));
      const modal = within(screen.getByRole("dialog", { name: "Confirmar reemplazo del CV" }));
      expect(modal.getByText("¿Deseas reemplazar el CV actual? El archivo anterior dejará de estar asociado a esta solicitud.")).toBeTruthy();
      expect(put).not.toHaveBeenCalled();
      fireEvent.click(modal.getByRole("button", { name: "Confirmar reemplazo" }));
      expect(await screen.findByText("CV reemplazado correctamente.")).toBeTruthy();
      expect(cv.getByText("CV_Benjamin_Ficticio.pdf")).toBeTruthy();
      expect(cv.queryByText("CV Lucía.pdf")).toBeNull();
      expect(put.mock.lastCall[0]).toBe("/solicitudes/s1/cv");
      expect(put.mock.lastCall[1].get("cv").name).toBe("CV_Benjamin_Ficticio.pdf");
      await esperarQue(() => get.mock.calls.filter(([ruta]) => ruta.endsWith("/carpeta")).length === 2);
      fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
      const edicion = within(screen.getByRole("dialog", { name: "Editar solicitud" }));
      expect(await edicion.findByText("CV_Benjamin_Ficticio.pdf", {}, { timeout: 3000 })).toBeTruthy();
    });

    it("rechaza Word y archivos de más de 5 MB antes de confirmar", async () => {
      await abrirDetalle(USUARIOS.admin);
      const put = vi.spyOn(api, "put");
      elegirArchivo(selector(), archivoDePrueba("CV.docx", WORD));
      expect(screen.getByRole("alert").textContent).toBe("Selecciona un archivo PDF.");
      elegirArchivo(selector(), archivoDePrueba("CV.pdf", "application/pdf", 5 * 1024 * 1024 + 1));
      expect(screen.getByRole("alert").textContent).toBe("El CV supera el tamaño máximo de 5 MB.");
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(put).not.toHaveBeenCalled();
    });

    it("un error conserva el CV original y permite cancelar sin actualizarlo", async () => {
      await abrirDetalle(USUARIOS.admin);
      const put = vi.spyOn(api, "put").mockRejectedValue(errorAxios(400, "No se pudo abrir el CV como un PDF válido."));
      elegirArchivo(selector(), archivoDePrueba("CV.pdf", "application/pdf"));
      fireEvent.click(screen.getByRole("button", { name: "Confirmar reemplazo" }));
      expect(await screen.findByText("No se pudo abrir el CV como un PDF válido.")).toBeTruthy();
      expect(within(fila("CV")).getByText("CV Lucía.pdf")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(put).toHaveBeenCalledOnce();
    });

    it("el evaluador asignado puede descargar el CV pero no reemplazarlo", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      expect(within(fila("CV")).getByRole("button", { name: "Descargar" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Reemplazar CV" })).toBeNull();
    });
  });

  describe("asignar evaluador desde el detalle", () => {
    it("el analista cambia el evaluador en el modal y el detalle se actualiza", async () => {
      // Arrange
      const solicitud = crearSolicitud({ analistaId: { nombre: "Ana Analista" }, candidato: { ...crearSolicitud().candidato, origen: "analista" } });
      await abrirDetalle(USUARIOS.analista, { solicitud });
      const put = vi.spyOn(api, "put").mockResolvedValue({
        data: { ...solicitud, analistaId: "id-sin-poblar", profesionalResponsable: { _id: "u-otto", nombre: "Otto Evaluador" } },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
      await screen.findByRole("heading", { name: "Editar solicitud" });

      // Act
      fireEvent.change(screen.getByLabelText("Profesional responsable (evaluador)"), { target: { value: "u-otto" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      // Assert: se cierra el modal, cambia el responsable y se conserva el analista ya poblado
      await esperarQue(() => screen.queryByRole("heading", { name: "Editar solicitud" }) === null, "que se cierre el modal");
      expect(screen.getByText("Otto Evaluador")).toBeTruthy();
      expect(screen.getByText("Creada por Ana Analista")).toBeTruthy();
      expect(put.mock.lastCall[0]).toBe("/solicitudes/s1");
    });

    it("cancelar en el modal lo cierra sin cambios", async () => {
      await abrirDetalle(USUARIOS.analista);
      fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
      await screen.findByRole("heading", { name: "Editar solicitud" });

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("heading", { name: "Editar solicitud" })).toBeNull();
      expect(screen.getByText("Eva Evaluadora")).toBeTruthy();
    });
  });
});
