// Login, RutaProtegida y Navbar. La sesión se simula dejando el usuario en localStorage (así la
// lee el AuthProvider real) y el backend se reemplaza con spies sobre la instancia de axios.
import { screen, fireEvent, waitFor } from "@testing-library/react";
import api from "../services/api";
import Login from "../pages/Login";
import Navbar from "../components/Navbar";
import RutaProtegida from "../components/RutaProtegida";
import { renderizar, iniciarSesionSimulada, limpiarSesion, USUARIOS, errorAxios } from "./ayudantes";

describe("Login", () => {
  beforeEach(() => limpiarSesion());
  afterEach(() => limpiarSesion());

  function completarYEnviar(correo, password) {
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: correo } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
  }

  it("llama al servicio de login con el correo y la contraseña ingresados", async () => {
    // Arrange: el backend (axios) responde con un usuario y su token
    const respuesta = { data: { token: "jwt-falso", usuario: USUARIOS.analista } };
    const post = spyOn(api, "post").and.resolveTo(respuesta);
    renderizar(<Login />, {
      ruta: "/login",
      rutaDelElemento: "/login",
      rutasExtra: [{ path: "/", texto: "Pantalla de inicio" }],
    });

    // Act
    completarYEnviar("ana@ejemplo.cl", "secreto123");

    // Assert
    await screen.findByText("Pantalla de inicio");
    expect(post).toHaveBeenCalledOnceWith("/auth/login", { correo: "ana@ejemplo.cl", password: "secreto123" });
    expect(localStorage.getItem("token")).toBe("jwt-falso");
  });

  it("muestra el mensaje del servidor cuando las credenciales son inválidas", async () => {
    // Arrange: el backend responde 401
    spyOn(api, "post").and.rejectWith(errorAxios(401, "Credenciales inválidas"));
    renderizar(<Login />, { ruta: "/login", rutaDelElemento: "/login" });

    // Act
    completarYEnviar("ana@ejemplo.cl", "clave-mala");

    // Assert: se queda en el login, con el error y sin sesión guardada
    expect(await screen.findByText("Credenciales inválidas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeTruthy();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("ofrece el enlace público para postular", () => {
    renderizar(<Login />, { ruta: "/login", rutaDelElemento: "/login" });

    expect(screen.getByRole("link", { name: "Postula aquí" }).getAttribute("href")).toBe("/postular");
  });
});

describe("RutaProtegida", () => {
  afterEach(() => limpiarSesion());

  const contenidoPrivado = <p>Contenido privado</p>;
  const destinos = [
    { path: "/login", texto: "Pantalla de login" },
    { path: "/", texto: "Pantalla de inicio" },
  ];

  it("sin sesión iniciada redirige al login", () => {
    limpiarSesion();

    renderizar(<RutaProtegida>{contenidoPrivado}</RutaProtegida>, {
      ruta: "/panel",
      rutaDelElemento: "/panel",
      rutasExtra: destinos,
    });

    expect(screen.getByText("Pantalla de login")).toBeTruthy();
    expect(screen.queryByText("Contenido privado")).toBeNull();
  });

  it("con sesión muestra el contenido protegido", () => {
    iniciarSesionSimulada(USUARIOS.evaluador);

    renderizar(<RutaProtegida>{contenidoPrivado}</RutaProtegida>, {
      ruta: "/panel",
      rutaDelElemento: "/panel",
      rutasExtra: destinos,
    });

    expect(screen.getByText("Contenido privado")).toBeTruthy();
  });

  it("si el rol no está permitido, redirige al inicio", () => {
    // Arrange: un evaluador intenta entrar a "Nueva solicitud" (solo analista y admin)
    iniciarSesionSimulada(USUARIOS.evaluador);

    // Act
    renderizar(<RutaProtegida roles={["analista", "admin"]}>{contenidoPrivado}</RutaProtegida>, {
      ruta: "/solicitudes/nueva",
      rutaDelElemento: "/solicitudes/nueva",
      rutasExtra: destinos,
    });

    // Assert
    expect(screen.getByText("Pantalla de inicio")).toBeTruthy();
    expect(screen.queryByText("Contenido privado")).toBeNull();
  });

  it("si el rol está permitido, muestra el contenido", () => {
    iniciarSesionSimulada(USUARIOS.admin);

    renderizar(<RutaProtegida roles={["analista", "admin"]}>{contenidoPrivado}</RutaProtegida>, {
      ruta: "/solicitudes/nueva",
      rutaDelElemento: "/solicitudes/nueva",
      rutasExtra: destinos,
    });

    expect(screen.getByText("Contenido privado")).toBeTruthy();
  });
});

describe("Navbar", () => {
  afterEach(() => limpiarSesion());

  it("sin sesión muestra solo iniciar sesión y registrarse", () => {
    limpiarSesion();

    renderizar(<Navbar />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Registrarse" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Panel" })).toBeNull();
  });

  it("al analista le muestra Panel y Nueva solicitud, con su nombre y rol", () => {
    iniciarSesionSimulada(USUARIOS.analista);

    renderizar(<Navbar />);

    expect(screen.getByRole("link", { name: "Panel" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Nueva solicitud" })).toBeTruthy();
    expect(screen.getByText("Ana Analista")).toBeTruthy();
    expect(screen.getByText("(analista)")).toBeTruthy();
  });

  it('al evaluador no le muestra "Nueva solicitud"', () => {
    iniciarSesionSimulada(USUARIOS.evaluador);

    renderizar(<Navbar />);

    expect(screen.getByRole("link", { name: "Panel" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Nueva solicitud" })).toBeNull();
  });

  it("cerrar sesión borra la sesión guardada y vuelve al login", async () => {
    iniciarSesionSimulada(USUARIOS.admin);
    renderizar(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeTruthy());
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("usuario")).toBeNull();
  });
});
