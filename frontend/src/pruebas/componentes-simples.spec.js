import { render, screen } from "@testing-library/react";
import EtiquetaPostulacionPublica, { esPostulacionPublica } from "../components/EtiquetaPostulacionPublica";
import SelectorCv from "../components/SelectorCv";
import { archivoDePrueba, elegirArchivo } from "./ayudantes";

describe("EtiquetaPostulacionPublica", () => {
  it('muestra el texto "Postulación pública"', () => {
    render(<EtiquetaPostulacionPublica />);

    expect(screen.getByText("Postulación pública")).toBeTruthy();
  });

  it("esPostulacionPublica distingue el origen del candidato", () => {
    // Arrange
    const publica = { candidato: { origen: "postulacion_publica" } };
    const deAnalista = { candidato: { origen: "analista" } };

    // Act + Assert
    expect(esPostulacionPublica(publica)).toBeTrue();
    expect(esPostulacionPublica(deAnalista)).toBeFalse();
    expect(esPostulacionPublica({})).toBeFalse();
    expect(esPostulacionPublica(undefined)).toBeFalse();
  });
});

describe("SelectorCv", () => {
  it("sin archivo, invita a seleccionar el CV e indica formatos y tamaño máximo", () => {
    render(<SelectorCv etiqueta="CV" archivo={null} onChange={() => {}} />);

    expect(screen.getByText("Haz clic para seleccionar el CV")).toBeTruthy();
    expect(screen.getByText("PDF, DOC o DOCX · máx. 5MB")).toBeTruthy();
    expect(document.querySelector('input[type="file"]').getAttribute("accept")).toBe(".pdf,.doc,.docx");
  });

  it("entrega el archivo elegido al componente padre (spy como callback)", () => {
    // Arrange
    const alCambiar = jasmine.createSpy("onChange");
    render(<SelectorCv etiqueta="CV" archivo={null} onChange={alCambiar} />);
    const cv = archivoDePrueba("mi-cv.pdf", "application/pdf");

    // Act
    elegirArchivo(document.querySelector('input[type="file"]'), cv);

    // Assert
    expect(alCambiar).toHaveBeenCalledOnceWith(cv);
  });

  it("con archivo, muestra su nombre y la opción de cambiarlo", () => {
    render(<SelectorCv etiqueta="CV" archivo={archivoDePrueba("cv-final.pdf", "application/pdf")} onChange={() => {}} />);

    expect(screen.getByText("cv-final.pdf")).toBeTruthy();
    expect(screen.getByText("Haz clic para cambiar el archivo")).toBeTruthy();
  });

  it("acepta otros formatos y textos (lo usa el informe de entrevista en Word)", () => {
    render(
      <SelectorCv
        etiqueta="Informe"
        archivo={null}
        onChange={() => {}}
        accept=".doc,.docx"
        textoSeleccionar="Haz clic para seleccionar el informe"
        formatos="Word (DOC o DOCX) · máx. 5MB"
      />
    );

    expect(screen.getByText("Haz clic para seleccionar el informe")).toBeTruthy();
    expect(document.querySelector('input[type="file"]').getAttribute("accept")).toBe(".doc,.docx");
  });
});
