// SolicitudDetalle: marcado de Bootstrap (encabezado, columnas, secciones por rol, estados de carga y
// error, modal). El backend se reemplaza con spies sobre la instancia de axios.
import { screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import SolicitudDetalle from "../pages/SolicitudDetalle";
import {
  renderizar,
  iniciarSesionSimulada,
  limpiarSesion,
  simularGet,
  errorAxios,
  esperarQue,
  USUARIOS,
} from "./ayudantes";

const EVALUADOR_AJENO = { id: "u-otro", nombre: "Otto Ajeno", correo: "otto@ejemplo.cl", rol: "evaluador" };

const SOLICITUD = {
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
  },
  familiaDeCargo: { _id: "fam-ventas", nombre: "Ventas" },
  profesionalResponsable: { _id: USUARIOS.evaluador.id, nombre: "Eva Evaluadora" },
  analistaId: null,
};

const EVALUACIONES = [
  { _id: "e1", fechaEvaluacion: "2026-10-05T00:00:00.000Z", estado: "Pendiente", resultado: "Primera entrevista" },
  { _id: "e2", fechaEvaluacion: "2026-10-06T00:00:00.000Z", estado: "Finalizada", resultado: "Cierre" },
];

const RESPUESTAS = {
  "/solicitudes/s1": SOLICITUD,
  "/solicitudes/s1/evaluaciones": EVALUACIONES,
  "/solicitudes/s1/informe": null,
  "/solicitudes/s1/informe/evaluacion": null,
  "/familias": [{ _id: "fam-ventas", nombre: "Ventas" }],
  "/usuarios": [{ _id: USUARIOS.evaluador.id, nombre: "Eva Evaluadora" }],
};

function renderizarDetalle() {
  renderizar(<SolicitudDetalle />, {
    ruta: "/solicitudes/s1",
    rutaDelElemento: "/solicitudes/:id",
    rutasExtra: [{ path: "/panel", texto: "Pantalla del panel" }],
  });
}

async function abrir(usuario, respuestas = RESPUESTAS) {
  iniciarSesionSimulada(usuario);
  simularGet(respuestas);
  renderizarDetalle();
  await screen.findByRole("heading", { name: "Archivos del candidato" });
  // Espera a que terminen de cargar las tarjetas de IA para que no queden cambios de estado pendientes.
  await esperarQue(
    () => !screen.queryByText("Cargando informe...") && !screen.queryByText("Cargando evaluación..."),
    "que terminen de cargar el informe y la evaluación de IA"
  );
}

const seccion = (titulo) => screen.getByRole("heading", { name: titulo }).closest("section");

describe("SolicitudDetalle: marcado de Bootstrap", () => {
  afterEach(() => limpiarSesion());

  describe("estados de carga y error", () => {
    it("mientras carga muestra un spinner con el texto, anunciado como estado", () => {
      iniciarSesionSimulada(USUARIOS.analista);
      vi.spyOn(api, "get").mockReturnValue(new Promise(() => {}));

      renderizarDetalle();

      const estado = screen.getByRole("status");
      expect(within(estado).getByText("Cargando solicitud...")).toBeTruthy();
      expect(estado.querySelector(".spinner-border")).not.toBeNull();
    });

    it("si falla la carga muestra una alerta de error y ninguna sección", async () => {
      iniciarSesionSimulada(USUARIOS.analista);
      simularGet({ ...RESPUESTAS, "/solicitudes/s1": errorAxios(404, "Solicitud no encontrada") });

      renderizarDetalle();

      const alerta = await screen.findByRole("alert");
      expect(alerta.classList.contains("alert-danger")).toBe(true);
      expect(alerta.textContent).toBe("Solicitud no encontrada");
      expect(screen.queryByRole("heading", { name: "Archivos del candidato" })).toBeNull();
    });
  });

  describe("encabezado", () => {
    it("muestra el nombre como título, el badge del estado y la etiqueta de postulación pública", async () => {
      await abrir(USUARIOS.analista);

      expect(screen.getByRole("heading", { level: 1, name: "Lucía Peña" })).toBeTruthy();
      expect(screen.getByText("Postulación pública").classList.contains("badge")).toBe(true);
      const estado = screen.getAllByText("En proceso").find((el) => el.classList.contains("badge"));
      expect(estado.classList.contains("text-bg-primary")).toBe(true);
    });

    it('"Volver al panel" es un botón secundario que navega al panel', async () => {
      await abrir(USUARIOS.analista);
      const volver = screen.getByRole("link", { name: /Volver al panel/ });
      expect(volver.classList.contains("btn-outline-secondary")).toBe(true);

      fireEvent.click(volver);

      expect(await screen.findByText("Pantalla del panel")).toBeTruthy();
      expect(screen.queryByRole("heading", { name: "Archivos del candidato" })).toBeNull();
    });
  });

  describe("distribución en columnas", () => {
    it("el informe y las evaluaciones van en la columna principal; los datos y archivos, en la lateral", async () => {
      await abrir(USUARIOS.admin);

      const principal = seccion("Informe psicolaboral").parentElement;
      const lateral = seccion("Datos de la solicitud").parentElement;
      expect(principal.classList.contains("col-lg-8")).toBe(true);
      expect(lateral.classList.contains("col-lg-4")).toBe(true);
      expect(principal.contains(seccion("Evaluaciones del evaluador"))).toBe(true);
      expect(lateral.contains(seccion("Archivos del candidato"))).toBe(true);
      // Ambas columnas ocupan todo el ancho en móvil.
      expect(principal.classList.contains("col-12")).toBe(true);
      expect(lateral.classList.contains("col-12")).toBe(true);
    });

    it("los datos se listan como pares título/valor apilados", async () => {
      await abrir(USUARIOS.analista);

      const datos = seccion("Datos de la solicitud");
      const lista = datos.querySelector("dl");
      expect(lista.classList.contains("list-group-flush")).toBe(true);
      expect(within(datos).getByText("Correo del candidato").tagName).toBe("DT");
      expect(within(datos).getByText("lucia@ejemplo.cl").tagName).toBe("DD");
      expect(within(datos).getByText("Postula a la sucursal norte")).toBeTruthy();
    });
  });

  describe("secciones y controles según el rol", () => {
    const controles = () => ({
      cambiar: screen.queryByRole("button", { name: /^(Cambiar|Asignar)$/ }) !== null,
      subirInforme: screen.queryByText("Subir informe de entrevista") !== null,
      nuevaEvaluacion: screen.queryByRole("button", { name: "+ Nueva evaluación" }) !== null,
      editarEvaluacion: screen.queryAllByRole("button", { name: "Editar" }).length > 0,
    });

    it.each([
      ["analista", USUARIOS.analista, { cambiar: true, subirInforme: true, nuevaEvaluacion: false, editarEvaluacion: false }],
      ["evaluador responsable", USUARIOS.evaluador, { cambiar: false, subirInforme: true, nuevaEvaluacion: true, editarEvaluacion: true }],
      ["evaluador ajeno", EVALUADOR_AJENO, { cambiar: false, subirInforme: false, nuevaEvaluacion: false, editarEvaluacion: false }],
      ["admin", USUARIOS.admin, { cambiar: true, subirInforme: true, nuevaEvaluacion: true, editarEvaluacion: true }],
    ])("%s: muestra todas las secciones y los controles que le corresponden", async (_nombre, usuario, esperado) => {
      await abrir(usuario);

      for (const titulo of ["Datos de la solicitud", "Archivos del candidato", "Informe psicolaboral", "Evaluaciones del evaluador"]) {
        expect(screen.getByRole("heading", { name: titulo }), titulo).toBeTruthy();
      }
      expect(controles()).toEqual(esperado);
    });

    it("sin evaluaciones muestra el mensaje de vacío en gris", async () => {
      await abrir(USUARIOS.analista, { ...RESPUESTAS, "/solicitudes/s1/evaluaciones": [] });

      const vacio = screen.getByText("Todavía no hay evaluaciones registradas.");
      expect(vacio.classList.contains("text-secondary")).toBe(true);
    });

    it("sin evaluador asignado muestra un badge de advertencia y el botón Asignar", async () => {
      await abrir(USUARIOS.analista, { ...RESPUESTAS, "/solicitudes/s1": { ...SOLICITUD, profesionalResponsable: null } });

      expect(screen.getByText("Sin evaluador asignado").classList.contains("text-bg-warning")).toBe(true);
      expect(screen.getByRole("button", { name: "Asignar" })).toBeTruthy();
    });
  });

  describe("origen de la solicitud", () => {
    const origen = () => within(seccion("Datos de la solicitud")).getByText("Origen").nextElementSibling.textContent;

    it("una postulación pública dice que viene del candidato, sin mostrar rutas técnicas", async () => {
      await abrir(USUARIOS.analista);

      expect(origen()).toBe("Postulación pública del candidato");
      expect(screen.queryByText("Analista que la creó")).toBeNull();
      expect(screen.queryByText(/\/postular/)).toBeNull();
    });

    it("una solicitud creada por un analista dice quién la creó", async () => {
      const creada = {
        ...SOLICITUD,
        candidato: { ...SOLICITUD.candidato, origen: "analista" },
        analistaId: { _id: USUARIOS.analista.id, nombre: "Ana Analista" },
      };
      await abrir(USUARIOS.analista, { ...RESPUESTAS, "/solicitudes/s1": creada });

      expect(origen()).toBe("Creada por Ana Analista");
    });

    it('si no se conoce al analista, dice "Creada por el equipo"', async () => {
      const creada = { ...SOLICITUD, candidato: { ...SOLICITUD.candidato, origen: "analista" }, analistaId: null };
      await abrir(USUARIOS.analista, { ...RESPUESTAS, "/solicitudes/s1": creada });

      expect(origen()).toBe("Creada por el equipo");
    });
  });

  describe("evaluaciones del evaluador", () => {
    it("cada evaluación es una tarjeta con la fecha, un badge de estado de color y su resultado", async () => {
      await abrir(USUARIOS.evaluador);

      const evaluaciones = seccion("Evaluaciones del evaluador");
      const pendiente = within(evaluaciones).getByText("Pendiente");
      const finalizada = within(evaluaciones).getByText("Finalizada");
      expect(pendiente.classList.contains("text-bg-warning")).toBe(true);
      expect(finalizada.classList.contains("text-bg-success")).toBe(true);
      expect(pendiente.closest(".card")).not.toBe(finalizada.closest(".card"));
      expect(within(pendiente.closest(".card")).getByText("Primera entrevista")).toBeTruthy();
      expect(within(finalizada.closest(".card")).getByText("06-10-2026")).toBeTruthy();
    });

    it("si el servidor rechaza una evaluación nueva, muestra una alerta de error y conserva el formulario", async () => {
      await abrir(USUARIOS.evaluador);
      vi.spyOn(api, "post").mockRejectedValue(errorAxios(400, "Fecha inválida"));
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      fireEvent.click(screen.getByRole("button", { name: "Crear evaluación" }));

      const alerta = await screen.findByRole("alert");
      expect(alerta.classList.contains("alert-danger")).toBe(true);
      expect(alerta.textContent).toBe("Fecha inválida");
      expect(screen.getByLabelText("Resultado / observaciones")).toBeTruthy();
    });

    it("mientras guarda una evaluación, el botón queda deshabilitado con spinner", async () => {
      await abrir(USUARIOS.evaluador);
      vi.spyOn(api, "post").mockReturnValue(new Promise(() => {}));
      fireEvent.click(screen.getByRole("button", { name: "+ Nueva evaluación" }));

      fireEvent.click(screen.getByRole("button", { name: "Crear evaluación" }));

      const boton = await screen.findByRole("button", { name: "Guardando..." });
      expect(boton.disabled).toBe(true);
      expect(boton.querySelector(".spinner-border")).not.toBeNull();
    });
  });

  describe("modal de editar solicitud", () => {
    it("se abre con el marcado de modal grande y se cierra con Escape o con el fondo", async () => {
      await abrir(USUARIOS.analista);

      fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
      const dialogo = await screen.findByRole("dialog", { name: "Editar solicitud" });
      expect(dialogo.querySelector(".modal-dialog").classList.contains("modal-lg")).toBe(true);
      expect(await screen.findByRole("heading", { name: "Editar solicitud" })).toBeTruthy();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
      fireEvent.click(await screen.findByRole("dialog", { name: "Editar solicitud" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
