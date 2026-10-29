// Servicios: cada uno debe llamar al endpoint y método HTTP correctos, con los datos correctos, y
// devolver lo que responde el backend. El backend se reemplaza con spies sobre la instancia de axios.
import api from "../services/api";
import * as authService from "../services/authService";
import * as solicitudService from "../services/solicitudService";
import * as evaluacionService from "../services/evaluacionService";
import { obtenerDashboard } from "../services/dashboardService";
import { listarFamilias } from "../services/familiaService";
import { listarUsuarios } from "../services/usuarioService";
import { archivoDePrueba, errorAxios } from "./ayudantes";

const RESPUESTA = { ok: true };

describe("Servicios de la API", () => {
  describe("authService", () => {
    it("login hace POST /auth/login con correo y contraseña", async () => {
      const post = vi.spyOn(api, "post").mockResolvedValue({ data: RESPUESTA });

      const resultado = await authService.login("ana@ejemplo.cl", "secreto");

      expect(post).toHaveBeenCalledExactlyOnceWith("/auth/login", { correo: "ana@ejemplo.cl", password: "secreto" });
      expect(resultado).toBe(RESPUESTA);
    });

    it("registrar hace POST /auth/registro con nombre, correo, contraseña y rol", async () => {
      const post = vi.spyOn(api, "post").mockResolvedValue({ data: RESPUESTA });

      await authService.registrar("Ana", "ana@ejemplo.cl", "secreto", "evaluador");

      expect(post).toHaveBeenCalledExactlyOnceWith("/auth/registro", {
        nombre: "Ana",
        correo: "ana@ejemplo.cl",
        password: "secreto",
        rol: "evaluador",
      });
    });

    it("obtenerPerfil hace GET /auth/perfil", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: RESPUESTA });

      expect(await authService.obtenerPerfil()).toBe(RESPUESTA);
      expect(get).toHaveBeenCalledExactlyOnceWith("/auth/perfil");
    });

    it("propaga el error del servidor para que la pantalla lo muestre", async () => {
      vi.spyOn(api, "post").mockRejectedValue(errorAxios(401, "Credenciales inválidas"));

      await expect(authService.login("ana@ejemplo.cl", "mala")).rejects.toEqual(
        expect.objectContaining({ response: expect.objectContaining({ status: 401 }) })
      );
    });
  });

  describe("solicitudService", () => {
    const DATOS = {
      candidatoNombre: "Diego Pérez",
      candidatoCorreo: "diego@ejemplo.cl",
      candidatoTelefono: "+56 9 1234 5678",
      familiaDeCargo: "fam-1",
      cargo: "Contador",
      observaciones: "",
      profesionalResponsable: "u-eva",
    };

    it("listarSolicitudes hace GET /solicitudes", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: [RESPUESTA] });

      expect(await solicitudService.listarSolicitudes()).toEqual([RESPUESTA]);
      expect(get).toHaveBeenCalledExactlyOnceWith("/solicitudes");
    });

    it("obtenerSolicitud hace GET /solicitudes/:id", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: RESPUESTA });

      await solicitudService.obtenerSolicitud("s1");

      expect(get).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1");
    });

    it("crearSolicitud hace POST /solicitudes con FormData, incluido el CV", async () => {
      const post = vi.spyOn(api, "post").mockResolvedValue({ data: RESPUESTA });
      const cv = archivoDePrueba("cv.pdf", "application/pdf");

      await solicitudService.crearSolicitud({ ...DATOS, cv });

      const [ruta, formData] = post.mock.lastCall;
      expect(ruta).toBe("/solicitudes");
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get("candidatoNombre")).toBe("Diego Pérez");
      expect(formData.get("candidatoTelefono")).toBe("+56 9 1234 5678");
      expect(formData.get("familiaDeCargo")).toBe("fam-1");
      expect(formData.get("profesionalResponsable")).toBe("u-eva");
      expect(formData.get("cv").name).toBe("cv.pdf");
    });

    it("sin CV no envía el campo cv y manda observaciones vacías", async () => {
      const post = vi.spyOn(api, "post").mockResolvedValue({ data: RESPUESTA });

      await solicitudService.crearSolicitud({ ...DATOS, observaciones: undefined, cv: null });

      const formData = post.mock.lastCall[1];
      expect(formData.has("cv")).toBe(false);
      expect(formData.get("observaciones")).toBe("");
    });

    it("actualizarSolicitud hace PUT /solicitudes/:id con FormData", async () => {
      const put = vi.spyOn(api, "put").mockResolvedValue({ data: RESPUESTA });

      await solicitudService.actualizarSolicitud("s1", DATOS);

      const [ruta, formData] = put.mock.lastCall;
      expect(ruta).toBe("/solicitudes/s1");
      expect(formData.get("cargo")).toBe("Contador");
    });

    it("actualizarEstadoSolicitud hace PATCH /solicitudes/:id/estado", async () => {
      const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: RESPUESTA });

      await solicitudService.actualizarEstadoSolicitud("s1", "Finalizada");

      expect(patch).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1/estado", { estado: "Finalizada" });
    });

    it("subirInformeEntrevista hace PUT con el archivo en el campo informe", async () => {
      const put = vi.spyOn(api, "put").mockResolvedValue({ data: RESPUESTA });
      const informe = archivoDePrueba("informe.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

      await solicitudService.subirInformeEntrevista("s1", informe);

      const [ruta, formData] = put.mock.lastCall;
      expect(ruta).toBe("/solicitudes/s1/informe-entrevista");
      expect(formData.get("informe").name).toBe("informe.docx");
    });

    it("eliminarSolicitud hace DELETE /solicitudes/:id", async () => {
      const borrar = vi.spyOn(api, "delete").mockResolvedValue({ data: RESPUESTA });

      await solicitudService.eliminarSolicitud("s1");

      expect(borrar).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1");
    });
  });

  describe("evaluacionService", () => {
    const EVALUACION = { fechaEvaluacion: "2026-10-05", resultado: "Bien", estado: "Pendiente" };

    it("listarEvaluaciones hace GET /solicitudes/:id/evaluaciones", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] });

      expect(await evaluacionService.listarEvaluaciones("s1")).toEqual([]);
      expect(get).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1/evaluaciones");
    });

    it("crearEvaluacion hace POST con fecha, resultado y estado", async () => {
      const post = vi.spyOn(api, "post").mockResolvedValue({ data: RESPUESTA });

      await evaluacionService.crearEvaluacion("s1", { ...EVALUACION, campoExtra: "no se envía" });

      expect(post).toHaveBeenCalledExactlyOnceWith("/solicitudes/s1/evaluaciones", EVALUACION);
    });

    it("actualizarEvaluacion hace PUT /evaluaciones/:id", async () => {
      const put = vi.spyOn(api, "put").mockResolvedValue({ data: RESPUESTA });

      await evaluacionService.actualizarEvaluacion("e1", EVALUACION);

      expect(put).toHaveBeenCalledExactlyOnceWith("/evaluaciones/e1", EVALUACION);
    });
  });

  describe("dashboard, familias y usuarios", () => {
    it("obtenerDashboard hace GET /dashboard", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: RESPUESTA });

      expect(await obtenerDashboard()).toBe(RESPUESTA);
      expect(get).toHaveBeenCalledExactlyOnceWith("/dashboard");
    });

    it("listarFamilias hace GET /familias", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] });

      await listarFamilias();

      expect(get).toHaveBeenCalledExactlyOnceWith("/familias");
    });

    it("listarUsuarios filtra por rol con el parámetro ?rol=", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] });

      await listarUsuarios("evaluador");

      expect(get).toHaveBeenCalledExactlyOnceWith("/usuarios", { params: { rol: "evaluador" } });
    });

    it("listarUsuarios sin rol no envía filtro", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] });

      await listarUsuarios();

      expect(get).toHaveBeenCalledExactlyOnceWith("/usuarios", { params: {} });
    });
  });
});
