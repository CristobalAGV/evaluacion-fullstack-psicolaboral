// Registro y Dashboard. El backend se reemplaza con spies sobre la instancia de axios.
import { screen, fireEvent, within } from "@testing-library/react";
import api from "../services/api";
import Registro from "../pages/Registro";
import Dashboard from "../pages/Dashboard";
import { renderizar, limpiarSesion, errorAxios, USUARIOS } from "./ayudantes";

describe("Registro", () => {
  beforeEach(() => limpiarSesion());
  afterEach(() => limpiarSesion());

  function abrirRegistro() {
    renderizar(<Registro />, {
      ruta: "/registro",
      rutaDelElemento: "/registro",
      rutasExtra: [{ path: "/", texto: "Pantalla de inicio" }],
    });
  }

  function completar({ nombre = "Eva Nueva", correo = "eva@ejemplo.cl", password = "secreto123", rol } = {}) {
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: nombre } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: correo } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: password } });
    if (rol) fireEvent.change(screen.getByLabelText("Rol"), { target: { value: rol } });
  }

  it("muestra el formulario con analista como rol por defecto", () => {
    abrirRegistro();

    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeTruthy();
    expect(screen.getByLabelText("Rol").value).toBe("analista");
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
  });

  it("el selector de rol NO ofrece admin", () => {
    abrirRegistro();

    const opciones = within(screen.getByLabelText("Rol")).getAllByRole("option").map((o) => o.value);

    expect(opciones).toEqual(["analista", "evaluador"]);
  });

  it("declara la contraseña como obligatoria y de al menos 6 caracteres", () => {
    // El navegador solo aplica minlength a lo que la persona escribe con el teclado; si el valor
    // se asigna desde un script nunca marca "tooShort". Por eso aquí se verifica la regla
    // declarada en el campo (el backend además rechaza contraseñas de menos de 6 caracteres).
    abrirRegistro();

    const password = screen.getByLabelText("Contraseña");

    expect(password.type).toBe("password");
    expect(password.required).toBeTrue();
    expect(password.minLength).toBe(6);
  });

  it("no envía si faltan campos obligatorios", () => {
    const post = spyOn(api, "post");
    abrirRegistro();

    fireEvent.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(screen.getByLabelText("Nombre").validity.valueMissing).toBeTrue();
    expect(post).not.toHaveBeenCalled();
  });

  it("no envía con el correo mal escrito", () => {
    const post = spyOn(api, "post");
    abrirRegistro();
    completar({ correo: "esto-no-es-un-correo" });

    fireEvent.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(screen.getByLabelText("Correo").validity.typeMismatch).toBeTrue();
    expect(post).not.toHaveBeenCalled();
  });

  it("envía los datos al servicio, guarda la sesión y lleva al inicio", async () => {
    // Arrange
    const post = spyOn(api, "post").and.resolveTo({
      data: { token: "jwt-nuevo", usuario: { ...USUARIOS.evaluador, nombre: "Eva Nueva" } },
    });
    abrirRegistro();
    completar({ rol: "evaluador" });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Registrarme" }));

    // Assert
    expect(await screen.findByText("Pantalla de inicio")).toBeTruthy();
    expect(post).toHaveBeenCalledOnceWith("/auth/registro", {
      nombre: "Eva Nueva",
      correo: "eva@ejemplo.cl",
      password: "secreto123",
      rol: "evaluador",
    });
    expect(localStorage.getItem("token")).toBe("jwt-nuevo");
  });

  it("muestra el error del servidor (correo ya registrado) y no inicia sesión", async () => {
    spyOn(api, "post").and.rejectWith(errorAxios(409, "Ya existe un usuario con ese correo"));
    abrirRegistro();
    completar();

    fireEvent.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(await screen.findByText("Ya existe un usuario con ese correo")).toBeTruthy();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("si el servidor no envía mensaje, muestra uno genérico", async () => {
    spyOn(api, "post").and.rejectWith(new Error("Network Error"));
    abrirRegistro();
    completar();

    fireEvent.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(await screen.findByText("Error al registrar usuario")).toBeTruthy();
  });
});

describe("Dashboard", () => {
  it("muestra las cuatro tarjetas con los totales del backend", async () => {
    // Arrange
    const get = spyOn(api, "get").and.resolveTo({
      data: { totalCandidatos: 12, solicitudesPendientes: 5, solicitudesEnProceso: 4, solicitudesFinalizadas: 3 },
    });

    // Act
    renderizar(<Dashboard />);

    // Assert
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(get).toHaveBeenCalledOnceWith("/dashboard");
    const valorDe = (titulo) => screen.getByText(titulo).nextElementSibling.textContent;
    expect(valorDe("Total candidatos")).toBe("12");
    expect(valorDe("Solicitudes pendientes")).toBe("5");
    expect(valorDe("Solicitudes en proceso")).toBe("4");
    expect(valorDe("Solicitudes finalizadas")).toBe("3");
  });

  it("muestra ceros cuando todavía no hay datos", async () => {
    spyOn(api, "get").and.resolveTo({
      data: { totalCandidatos: 0, solicitudesPendientes: 0, solicitudesEnProceso: 0, solicitudesFinalizadas: 0 },
    });

    renderizar(<Dashboard />);

    await screen.findByRole("heading", { name: "Dashboard" });
    expect(screen.getAllByText("0").length).toBe(4);
  });

  it('muestra "Cargando..." mientras espera la respuesta', () => {
    spyOn(api, "get").and.returnValue(new Promise(() => {}));

    renderizar(<Dashboard />);

    expect(screen.getByText("Cargando dashboard...")).toBeTruthy();
  });

  it("muestra el error y ninguna tarjeta si el backend falla", async () => {
    spyOn(api, "get").and.rejectWith(errorAxios(500, "Error al calcular el dashboard"));

    renderizar(<Dashboard />);

    expect(await screen.findByText("Error al calcular el dashboard")).toBeTruthy();
    expect(screen.queryByText("Total candidatos")).toBeNull();
  });

  it("si el error no trae mensaje, muestra uno genérico", async () => {
    spyOn(api, "get").and.rejectWith(new Error("Network Error"));

    renderizar(<Dashboard />);

    expect(await screen.findByText("Error al cargar el dashboard")).toBeTruthy();
  });
});
