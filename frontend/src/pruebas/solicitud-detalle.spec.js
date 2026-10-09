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

async function abrirDetalle(usuario, { solicitud = crearSolicitud(), evaluaciones = EVALUACIONES } = {}) {
  iniciarSesionSimulada(usuario);
  const get = simularGet({
    "/solicitudes/s1": solicitud,
    "/solicitudes/s1/evaluaciones": evaluaciones,
    "/familias": [{ _id: "fam-ventas", nombre: "Ventas" }],
    "/usuarios": [
      { _id: USUARIOS.evaluador.id, nombre: "Eva Evaluadora" },
      { _id: "u-otto", nombre: "Otto Evaluador" },
    ],
  });
  renderizar(<SolicitudDetalle />, { ruta: "/solicitudes/s1", rutaDelElemento: "/solicitudes/:id" });
  await screen.findByRole("heading", { name: "Archivos del candidato" });
  return get;
}

const fila = (etiqueta) => screen.getByText(etiqueta, { exact: true }).closest("div.rounded-md.border");
const subirInformeVisible = () => screen.queryByText(/^(Subir|Reemplazar) informe de entrevista$/) !== null;

describe("SolicitudDetalle", () => {
  afterEach(() => limpiarSesion());

  describe("datos y archivos", () => {
    it("muestra los datos del candidato y de la solicitud", async () => {
      await abrirDetalle(USUARIOS.analista);

      expect(screen.getByRole("heading", { name: "Lucía Peña" })).toBeTruthy();
      expect(screen.getByText("Postulación pública")).toBeTruthy();
      expect(screen.getByText("lucia@ejemplo.cl")).toBeTruthy();
      expect(screen.getByText("+56 9 8765 4321")).toBeTruthy();
      expect(screen.getByText("Ejecutiva de ventas")).toBeTruthy();
      expect(screen.getByText("Ventas")).toBeTruthy();
      expect(screen.getByText("Eva Evaluadora")).toBeTruthy();
      expect(screen.getByText("Enviada por el candidato desde /postular")).toBeTruthy();
      expect(screen.getByText("Postula a la sucursal norte")).toBeTruthy();
    });

    it('en "Archivos del candidato" el CV se puede descargar y el informe antiguo dice "Archivo no disponible"', async () => {
      await abrirDetalle(USUARIOS.analista);

      expect(within(fila("CV")).getByText("CV Lucía.pdf")).toBeTruthy();
      expect(within(fila("CV")).getByRole("button", { name: "Descargar" })).toBeTruthy();
      expect(within(fila("Informe de entrevista")).getByText("Archivo no disponible")).toBeTruthy();
      expect(within(fila("Informe de entrevista")).queryByRole("button", { name: "Descargar" })).toBeNull();
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

  describe("botones según el rol", () => {
    it("analista: puede cambiar el evaluador y subir el informe, pero no gestiona evaluaciones", async () => {
      await abrirDetalle(USUARIOS.analista);

      expect(screen.getByRole("button", { name: "Cambiar" })).toBeTruthy();
      expect(subirInformeVisible()).toBeTrue();
      expect(screen.queryByRole("button", { name: "+ Nueva evaluación" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    });

    it("evaluador responsable: gestiona evaluaciones y sube el informe, pero no reasigna", async () => {
      await abrirDetalle(USUARIOS.evaluador);

      expect(screen.getByRole("button", { name: "+ Nueva evaluación" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
      expect(subirInformeVisible()).toBeTrue();
      expect(screen.queryByRole("button", { name: "Cambiar" })).toBeNull();
    });

    it("evaluador ajeno: solo puede mirar (sin evaluaciones, sin informe, sin reasignar)", async () => {
      await abrirDetalle(EVALUADOR_AJENO);

      expect(screen.queryByRole("button", { name: "+ Nueva evaluación" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
      expect(subirInformeVisible()).toBeFalse();
      expect(screen.queryByRole("button", { name: "Cambiar" })).toBeNull();
      // Pero sí puede descargar el CV
      expect(within(fila("CV")).getByRole("button", { name: "Descargar" })).toBeTruthy();
    });

    it("admin: puede todo", async () => {
      await abrirDetalle(USUARIOS.admin);

      expect(screen.getByRole("button", { name: "Cambiar" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "+ Nueva evaluación" })).toBeTruthy();
      expect(subirInformeVisible()).toBeTrue();
    });
  });

  describe("evaluaciones", () => {
    it("el responsable crea una evaluación y aparece en la lista", async () => {
      // Arrange
      await abrirDetalle(USUARIOS.evaluador);
      const nueva = { _id: "e2", fechaEvaluacion: "2026-10-06T00:00:00.000Z", estado: "En proceso", resultado: "Segunda entrevista" };
      const post = spyOn(api, "post").and.resolveTo({ data: nueva });
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      // Act
      fireEvent.change(screen.getByLabelText("Fecha de evaluación"), { target: { value: "2026-10-06" } });
      fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "En proceso" } });
      fireEvent.change(screen.getByLabelText("Resultado / observaciones"), { target: { value: "Segunda entrevista" } });
      fireEvent.click(screen.getByRole("button", { name: "Crear evaluación" }));

      // Assert
      expect(await screen.findByText("Segunda entrevista")).toBeTruthy();
      expect(post).toHaveBeenCalledOnceWith("/solicitudes/s1/evaluaciones", {
        fechaEvaluacion: "2026-10-06",
        resultado: "Segunda entrevista",
        estado: "En proceso",
      });
      expect(screen.getByText("06-10-2026")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Crear evaluación" })).toBeNull();
    });

    it("si el servidor rechaza la evaluación, muestra el error y mantiene el formulario", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      spyOn(api, "post").and.rejectWith(errorAxios(403, "Solo el evaluador responsable puede gestionar sus evaluaciones"));
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      fireEvent.click(screen.getByRole("button", { name: "Crear evaluación" }));

      expect(await screen.findByText("Solo el evaluador responsable puede gestionar sus evaluaciones")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Crear evaluación" })).toBeTruthy();
    });

    it("cancelar la nueva evaluación cierra el formulario sin llamar a la API", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      const post = spyOn(api, "post");
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("button", { name: "Crear evaluación" })).toBeNull();
      expect(post).not.toHaveBeenCalled();
    });

    it("el responsable edita una evaluación existente", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      const put = spyOn(api, "put").and.resolveTo({ data: { ...EVALUACIONES[0], resultado: "Entrevista revisada" } });
      fireEvent.click(screen.getByRole("button", { name: "Editar" }));

      expect(screen.getByLabelText("Fecha de evaluación").value).toBe("2026-10-05");
      fireEvent.change(screen.getByLabelText("Resultado / observaciones"), { target: { value: "Entrevista revisada" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText("Entrevista revisada")).toBeTruthy();
      expect(put).toHaveBeenCalledOnceWith("/evaluaciones/e1", {
        fechaEvaluacion: "2026-10-05",
        resultado: "Entrevista revisada",
        estado: "Pendiente",
      });
    });
  });

  describe("informe de entrevista", () => {
    const inputInforme = () => document.querySelector('input[type="file"][accept=".doc,.docx"]');

    it("rechaza un archivo que no es Word", async () => {
      await abrirDetalle(USUARIOS.evaluador);

      elegirArchivo(inputInforme(), archivoDePrueba("informe.pdf", "application/pdf"));

      expect(screen.getByText("El informe debe ser un archivo Word (DOC o DOCX).")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Guardar informe" }).disabled).toBeTrue();
    });

    it("rechaza un Word de más de 5 MB", async () => {
      await abrirDetalle(USUARIOS.evaluador);

      elegirArchivo(inputInforme(), archivoDePrueba("informe.docx", WORD, 5 * 1024 * 1024 + 1));

      expect(screen.getByText("El informe supera el tamaño máximo de 5 MB.")).toBeTruthy();
    });

    it("sube el Word con PUT y lo muestra como informe actual", async () => {
      // Arrange
      await abrirDetalle(USUARIOS.evaluador);
      const put = spyOn(api, "put").and.resolveTo({
        data: { informeArchivo: { _id: "a-inf", nombreOriginal: "Informe Lucía.docx" } },
      });
      elegirArchivo(inputInforme(), archivoDePrueba("Informe Lucía.docx", WORD));

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Guardar informe" }));

      // Assert
      expect(await within(fila("Informe de entrevista")).findByText("Informe Lucía.docx")).toBeTruthy();
      expect(within(fila("Informe de entrevista")).getByRole("button", { name: "Descargar" })).toBeTruthy();
      expect(screen.getByText("Reemplazar informe de entrevista")).toBeTruthy();
      const [ruta, formData] = put.calls.mostRecent().args;
      expect(ruta).toBe("/solicitudes/s1/informe-entrevista");
      expect(formData.get("informe").name).toBe("Informe Lucía.docx");
    });

    it("muestra el error del servidor si rechaza el informe", async () => {
      await abrirDetalle(USUARIOS.evaluador);
      spyOn(api, "put").and.rejectWith(errorAxios(400, "El contenido del archivo no corresponde a un Word (DOC o DOCX) válido."));
      elegirArchivo(inputInforme(), archivoDePrueba("falso.docx", WORD));

      fireEvent.click(screen.getByRole("button", { name: "Guardar informe" }));

      expect(await screen.findByText("El contenido del archivo no corresponde a un Word (DOC o DOCX) válido.")).toBeTruthy();
    });
  });

  describe("asignar evaluador desde el detalle", () => {
    it("el analista cambia el evaluador en el modal y el detalle se actualiza", async () => {
      // Arrange
      const solicitud = crearSolicitud({ analistaId: { nombre: "Ana Analista" }, candidato: { ...crearSolicitud().candidato, origen: "analista" } });
      await abrirDetalle(USUARIOS.analista, { solicitud });
      const put = spyOn(api, "put").and.resolveTo({
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
      expect(screen.getByText("Ana Analista")).toBeTruthy();
      expect(put.calls.mostRecent().args[0]).toBe("/solicitudes/s1");
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
