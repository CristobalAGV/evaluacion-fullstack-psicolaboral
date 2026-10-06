// Interceptores de services/api.js. Para que la petición pase de verdad por los interceptores se
// usa un "adapter" falso de axios (la pieza que normalmente hace la llamada HTTP): recibe la
// configuración final y responde lo que la prueba decide, sin salir a la red.
import { render, screen, act } from "@testing-library/react";
import { AxiosError } from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api, { registrarManejadorNoAutorizado } from "../services/api";
import { AuthProvider } from "../context/AuthContext";
import Login from "../pages/Login";
import { iniciarSesionSimulada, limpiarSesion, USUARIOS } from "./ayudantes";

// Adapter que responde 200 y deja anotada la configuración que recibió.
function adapterExitoso(registro) {
  return (config) => {
    registro.config = config;
    return Promise.resolve({ data: { ok: true }, status: 200, statusText: "OK", headers: {}, config });
  };
}

// Adapter que responde con un error HTTP (como haría axios ante un 401 o un 500 real).
function adapterConError(estado) {
  return (config) => {
    const respuesta = { data: { mensaje: "error simulado" }, status: estado, statusText: "", headers: {}, config };
    return Promise.reject(new AxiosError(`Error ${estado}`, "ERR_BAD_REQUEST", config, null, respuesta));
  };
}

describe("Interceptores de api.js", () => {
  afterEach(() => {
    limpiarSesion();
    registrarManejadorNoAutorizado(null);
  });

  describe("al enviar una petición", () => {
    it("agrega el token guardado en la cabecera Authorization", async () => {
      // Arrange
      iniciarSesionSimulada(USUARIOS.analista);
      const registro = {};

      // Act
      await api.get("/solicitudes", { adapter: adapterExitoso(registro) });

      // Assert
      expect(registro.config.headers.Authorization).toBe("Bearer token-de-prueba");
      expect(registro.config.baseURL).toBe("http://localhost:4000/api");
    });

    it("sin sesión no agrega la cabecera Authorization", async () => {
      limpiarSesion();
      const registro = {};

      await api.get("/postulaciones/familias", { adapter: adapterExitoso(registro) });

      expect(registro.config.headers.Authorization).toBeUndefined();
    });
  });

  describe("al recibir un error", () => {
    it("ante un 401 en una ruta privada avisa al manejador de sesión expirada y propaga el error", async () => {
      const manejador = jasmine.createSpy("manejarNoAutorizado");
      registrarManejadorNoAutorizado(manejador);

      await expectAsync(api.get("/solicitudes", { adapter: adapterConError(401) })).toBeRejected();

      expect(manejador).toHaveBeenCalledTimes(1);
    });

    it("un 401 en el login (credenciales incorrectas) NO se trata como sesión expirada", async () => {
      const manejador = jasmine.createSpy("manejarNoAutorizado");
      registrarManejadorNoAutorizado(manejador);

      await expectAsync(api.post("/auth/login", {}, { adapter: adapterConError(401) })).toBeRejected();

      expect(manejador).not.toHaveBeenCalled();
    });

    it("un 401 en una ruta pública (/postulaciones) tampoco cierra la sesión", async () => {
      const manejador = jasmine.createSpy("manejarNoAutorizado");
      registrarManejadorNoAutorizado(manejador);

      await expectAsync(api.post("/postulaciones", {}, { adapter: adapterConError(401) })).toBeRejected();

      expect(manejador).not.toHaveBeenCalled();
    });

    it("otros errores (500) no cierran la sesión", async () => {
      const manejador = jasmine.createSpy("manejarNoAutorizado");
      registrarManejadorNoAutorizado(manejador);

      await expectAsync(api.get("/dashboard", { adapter: adapterConError(500) })).toBeRejected();

      expect(manejador).not.toHaveBeenCalled();
    });
  });

  describe("integrado con AuthProvider", () => {
    it("ante un 401 limpia la sesión y lleva al login con el mensaje de sesión expirada", async () => {
      // Arrange: sesión iniciada, mirando una pantalla privada. AuthProvider registra el manejador.
      iniciarSesionSimulada(USUARIOS.analista);
      render(
        <MemoryRouter initialEntries={["/panel"]}>
          <AuthProvider>
            <Routes>
              <Route path="/panel" element={<p>Pantalla privada</p>} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
      expect(screen.getByText("Pantalla privada")).toBeTruthy();

      // Act: el backend responde 401 (token vencido). Va dentro de act() porque el manejador
      // actualiza el estado de AuthProvider desde la promesa de axios, fuera de un evento de React.
      await act(async () => {
        await expectAsync(api.get("/solicitudes", { adapter: adapterConError(401) })).toBeRejected();
      });

      // Assert
      expect(await screen.findByText("Tu sesión expiró, vuelve a iniciar sesión")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("usuario")).toBeNull();
    });
  });
});
