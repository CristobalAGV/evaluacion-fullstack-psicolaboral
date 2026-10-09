// CampoPassword (contraseña con botón mostrar/ocultar) y su uso dentro de Login y Registro.
// El backend se reemplaza con spies sobre la instancia de axios.
import { render, screen, fireEvent } from "@testing-library/react";
import api from "../services/api";
import CampoPassword from "../components/CampoPassword";
import Login from "../pages/Login";
import Registro from "../pages/Registro";
import { renderizar, limpiarSesion, USUARIOS } from "./ayudantes";

describe("CampoPassword", () => {
  function botonMostrar() {
    return screen.getByRole("button", { name: "Mostrar contraseña" });
  }

  function botonOcultar() {
    return screen.getByRole("button", { name: "Ocultar contraseña" });
  }

  it("parte oculto: el campo es de tipo password y el botón dice Ver", () => {
    render(<CampoPassword value="" onChange={() => {}} />);

    const campo = screen.getByLabelText("Contraseña");

    expect(campo.type).toBe("password");
    expect(botonMostrar().textContent).toBe("Ver");
    expect(botonMostrar().getAttribute("aria-pressed")).toBe("false");
  });

  it("al presionar el botón muestra la contraseña y luego la vuelve a ocultar", () => {
    // Arrange
    render(<CampoPassword value="secreto123" onChange={() => {}} />);
    const campo = screen.getByLabelText("Contraseña");

    // Act: mostrar
    fireEvent.click(botonMostrar());

    // Assert: texto visible, mismo valor y el botón cambia de nombre y estado
    expect(campo.type).toBe("text");
    expect(campo.value).toBe("secreto123");
    expect(botonOcultar().textContent).toBe("Ocultar");
    expect(botonOcultar().getAttribute("aria-pressed")).toBe("true");

    // Act: ocultar
    fireEvent.click(botonOcultar());

    // Assert
    expect(campo.type).toBe("password");
    expect(campo.value).toBe("secreto123");
    expect(botonMostrar()).toBeTruthy();
  });

  it("entrega lo escrito al componente padre (spy como callback), esté visible u oculto", () => {
    // El campo es controlado con value="" fijo: React lo restablece tras el evento, así que el
    // valor se lee dentro del callback, en el momento en que el padre lo recibe.
    const recibidos = [];
    const alCambiar = jasmine.createSpy("onChange").and.callFake((e) => recibidos.push(e.target.value));
    render(<CampoPassword value="" onChange={alCambiar} />);
    const campo = screen.getByLabelText("Contraseña");

    fireEvent.change(campo, { target: { value: "oculta" } });
    fireEvent.click(botonMostrar());
    fireEvent.change(campo, { target: { value: "visible" } });

    expect(alCambiar).toHaveBeenCalledTimes(2);
    expect(recibidos).toEqual(["oculta", "visible"]);
  });

  it("el botón no envía el formulario que lo contiene", () => {
    const alEnviar = jasmine.createSpy("onSubmit").and.callFake((e) => e.preventDefault());
    render(
      <form onSubmit={alEnviar}>
        <CampoPassword value="" onChange={() => {}} required={false} />
      </form>
    );

    fireEvent.click(botonMostrar());

    expect(botonOcultar().getAttribute("type")).toBe("button");
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it("respeta la etiqueta, autoComplete, minLength y required que recibe", () => {
    render(
      <CampoPassword
        value=""
        onChange={() => {}}
        etiqueta="Nueva contraseña"
        autoComplete="new-password"
        minLength={8}
        required={false}
      />
    );

    const campo = screen.getByLabelText("Nueva contraseña");

    expect(campo.getAttribute("autocomplete")).toBe("new-password");
    expect(campo.minLength).toBe(8);
    expect(campo.required).toBeFalse();
  });

  it("por defecto es obligatorio", () => {
    render(<CampoPassword value="" onChange={() => {}} />);

    expect(screen.getByLabelText("Contraseña").required).toBeTrue();
  });

  it("dos campos en la misma pantalla tienen ids distintos y cada etiqueta apunta al suyo", () => {
    render(
      <>
        <CampoPassword value="" onChange={() => {}} etiqueta="Contraseña" />
        <CampoPassword value="" onChange={() => {}} etiqueta="Repetir contraseña" />
      </>
    );

    const primero = screen.getByLabelText("Contraseña");
    const segundo = screen.getByLabelText("Repetir contraseña");

    expect(primero.id).not.toBe(segundo.id);
  });
});

describe("CampoPassword dentro de Login", () => {
  beforeEach(() => limpiarSesion());
  afterEach(() => limpiarSesion());

  function abrirLogin() {
    renderizar(<Login />, {
      ruta: "/login",
      rutaDelElemento: "/login",
      rutasExtra: [{ path: "/", texto: "Pantalla de inicio" }],
    });
  }

  it("usa autoComplete current-password y parte oculto", () => {
    abrirLogin();

    const campo = screen.getByLabelText("Contraseña");

    expect(campo.type).toBe("password");
    expect(campo.getAttribute("autocomplete")).toBe("current-password");
  });

  it("permite ver lo escrito y aun así inicia sesión con esa contraseña", async () => {
    // Arrange
    const post = spyOn(api, "post").and.resolveTo({ data: { token: "jwt-falso", usuario: USUARIOS.analista } });
    abrirLogin();
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.cl" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secreto123" } });

    // Act: mostrar la contraseña no envía nada; luego se envía con el botón Ingresar
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña").type).toBe("text");
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    // Assert
    await screen.findByText("Pantalla de inicio");
    expect(post).toHaveBeenCalledOnceWith("/auth/login", { correo: "ana@ejemplo.cl", password: "secreto123" });
  });
});

describe("CampoPassword dentro de Registro", () => {
  beforeEach(() => limpiarSesion());
  afterEach(() => limpiarSesion());

  function abrirRegistro() {
    renderizar(<Registro />, {
      ruta: "/registro",
      rutaDelElemento: "/registro",
      rutasExtra: [{ path: "/", texto: "Pantalla de inicio" }],
    });
  }

  it("usa autoComplete new-password y mantiene el mínimo de 6 caracteres al mostrarla", () => {
    abrirRegistro();
    const campo = screen.getByLabelText("Contraseña");

    expect(campo.getAttribute("autocomplete")).toBe("new-password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    expect(campo.type).toBe("text");
    expect(campo.minLength).toBe(6);
    expect(campo.required).toBeTrue();
  });

  it("con la contraseña visible, registra al usuario con lo escrito", async () => {
    // Arrange
    const post = spyOn(api, "post").and.resolveTo({ data: { token: "jwt-nuevo", usuario: USUARIOS.analista } });
    abrirRegistro();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Nueva" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.cl" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secreto123" } });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Registrarme" }));

    // Assert
    await screen.findByText("Pantalla de inicio");
    expect(post).toHaveBeenCalledOnceWith("/auth/registro", {
      nombre: "Ana Nueva",
      correo: "ana@ejemplo.cl",
      password: "secreto123",
      rol: "analista",
    });
  });
});
