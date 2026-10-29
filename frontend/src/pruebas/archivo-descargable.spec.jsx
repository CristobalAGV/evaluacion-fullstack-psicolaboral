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
    const get = vi.spyOn(api, "get").mockResolvedValue({
      data: contenido,
      headers: { "content-disposition": "attachment; filename=\"CV Lucia.pdf\"; filename*=UTF-8''CV%20Luc%C3%ADa.pdf" },
    });
    const crearUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:prueba");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    let nombreDescargado = null;
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      nombreDescargado = this.download;
    });
    render(<ArchivoDescargable etiqueta="CV" archivo={{ _id: "abc123", nombreOriginal: "CV Lucía.pdf" }} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));

    // Assert
    await esperarQue(() => clic.mock.calls.length === 1, "que se haga clic en el enlace de descarga");
    expect(get).toHaveBeenCalledExactlyOnceWith("/archivos/abc123", { responseType: "blob" });
    expect(crearUrl).toHaveBeenCalledExactlyOnceWith(contenido);
    expect(nombreDescargado).toBe("CV Lucía.pdf");
    expect(screen.getByText("CV Lucía.pdf")).toBeTruthy();
  });

  it("si la API falla, muestra el mensaje del servidor (que llega como Blob)", async () => {
    // Arrange: con responseType "blob" el error JSON también llega como Blob
    const error = new Error("404");
    error.response = { status: 404, data: new Blob([JSON.stringify({ mensaje: "Archivo no encontrado" })]) };
    vi.spyOn(api, "get").mockRejectedValue(error);
    render(<ArchivoDescargable etiqueta="CV" archivo="id-solo" />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));

    // Assert
    expect(await screen.findByText("Archivo no encontrado")).toBeTruthy();
  });
});
