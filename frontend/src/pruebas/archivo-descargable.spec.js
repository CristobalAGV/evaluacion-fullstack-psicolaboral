// ArchivoDescargable + services/archivoService. La descarga va por axios con el token; aquí
// axios, URL.createObjectURL y el clic del enlace se reemplazan con spies para no descargar nada.
import { render, screen, fireEvent } from "@testing-library/react";
import api from "../services/api";
import ArchivoDescargable from "../components/ArchivoDescargable";
import { esperarQue } from "./ayudantes";

describe("ArchivoDescargable", () => {
  it('muestra "Archivo no disponible" para datos antiguos guardados en disco', () => {
    render(<ArchivoDescargable etiqueta="CV" archivo={null} rutaAntigua="/uploads/cv-viejo.pdf" />);

    expect(screen.getByText("Archivo no disponible")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Descargar" })).toBeNull();
  });

  it('muestra "Sin archivo" cuando no hay archivo ni ruta antigua', () => {
    render(<ArchivoDescargable etiqueta="Informe de entrevista" archivo={null} />);

    expect(screen.getByText("Sin archivo")).toBeTruthy();
  });

  it("al descargar pide el archivo a la API (con sesión) y dispara la descarga con su nombre", async () => {
    // Arrange
    const contenido = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const get = spyOn(api, "get").and.resolveTo({
      data: contenido,
      headers: { "content-disposition": "attachment; filename=\"CV Lucia.pdf\"; filename*=UTF-8''CV%20Luc%C3%ADa.pdf" },
    });
    const crearUrl = spyOn(URL, "createObjectURL").and.returnValue("blob:prueba");
    spyOn(URL, "revokeObjectURL");
    let nombreDescargado = null;
    const clic = spyOn(HTMLAnchorElement.prototype, "click").and.callFake(function () {
      nombreDescargado = this.download;
    });
    render(<ArchivoDescargable etiqueta="CV" archivo={{ _id: "abc123", nombreOriginal: "CV Lucía.pdf" }} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));

    // Assert
    await esperarQue(() => clic.calls.count() === 1, "que se haga clic en el enlace de descarga");
    expect(get).toHaveBeenCalledOnceWith("/archivos/abc123", { responseType: "blob" });
    expect(crearUrl).toHaveBeenCalledOnceWith(contenido);
    expect(nombreDescargado).toBe("CV Lucía.pdf");
    expect(screen.getByText("CV Lucía.pdf")).toBeTruthy();
  });

  it("si la API falla, muestra el mensaje del servidor (que llega como Blob)", async () => {
    // Arrange: con responseType "blob" el error JSON también llega como Blob
    const error = new Error("404");
    error.response = { status: 404, data: new Blob([JSON.stringify({ mensaje: "Archivo no encontrado" })]) };
    spyOn(api, "get").and.rejectWith(error);
    render(<ArchivoDescargable etiqueta="CV" archivo="id-solo" />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));

    // Assert
    expect(await screen.findByText("Archivo no encontrado")).toBeTruthy();
  });
});
