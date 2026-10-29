// Funciones puras de búsqueda y filtros del Panel (utils/filtrosPanel.js).
import {
  FILTROS_INICIALES,
  filtrarSolicitudes,
  hayFiltrosActivos,
  normalizar,
  opcionesUnicas,
} from "../utils/filtrosPanel";

const SOLICITUDES = [
  { _id: "1", cargo: "Contador", candidato: { nombre: "Ñandú Pérez", origen: "postulacion_publica" }, familiaDeCargo: { nombre: "Finanzas" }, profesionalResponsable: { nombre: "Eva" } },
  { _id: "2", cargo: "Vendedor", candidato: { nombre: "Luz Soto", origen: "analista" }, familiaDeCargo: { nombre: "Ventas" }, profesionalResponsable: null },
  { _id: "3", cargo: undefined, candidato: undefined, familiaDeCargo: undefined, profesionalResponsable: undefined },
];
const ids = (lista) => lista.map((s) => s._id);

describe("utils/filtrosPanel", () => {
  it("normalizar quita tildes y mayúsculas, y tolera valores vacíos", () => {
    expect(normalizar("ÁÉÍÓÚ Ñandú")).toBe("aeiou nandu");
    expect(normalizar(undefined)).toBe("");
    expect(normalizar(null)).toBe("");
  });

  it("hayFiltrosActivos detecta cada filtro, e ignora un texto de solo espacios", () => {
    expect(hayFiltrosActivos(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, busqueda: "  " })).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, busqueda: "a" })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, area: "Ventas" })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, responsable: "Eva" })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, origen: "publica" })).toBe(true);
  });

  it("sin filtros devuelve todas las solicitudes, incluso las con datos faltantes", () => {
    expect(ids(filtrarSolicitudes(SOLICITUDES, FILTROS_INICIALES))).toEqual(["1", "2", "3"]);
  });

  it("la búsqueda mira el nombre y el cargo, sin tildes ni mayúsculas, sin romper con datos faltantes", () => {
    expect(ids(filtrarSolicitudes(SOLICITUDES, { ...FILTROS_INICIALES, busqueda: "NANDU" }))).toEqual(["1"]);
    expect(ids(filtrarSolicitudes(SOLICITUDES, { ...FILTROS_INICIALES, busqueda: "vendedor" }))).toEqual(["2"]);
  });

  it("no mezcla el nombre con el cargo para encontrar coincidencias falsas", () => {
    // "z contador" aparecería si se uniera "Ñandú Pérez" + "Contador"; no debe coincidir.
    expect(filtrarSolicitudes(SOLICITUDES, { ...FILTROS_INICIALES, busqueda: "z contador" })).toEqual([]);
  });

  it("filtra por área, responsable y origen", () => {
    expect(ids(filtrarSolicitudes(SOLICITUDES, { ...FILTROS_INICIALES, area: "Ventas" }))).toEqual(["2"]);
    expect(ids(filtrarSolicitudes(SOLICITUDES, { ...FILTROS_INICIALES, responsable: "Eva" }))).toEqual(["1"]);
    expect(ids(filtrarSolicitudes(SOLICITUDES, { ...FILTROS_INICIALES, origen: "publica" }))).toEqual(["1"]);
    expect(ids(filtrarSolicitudes(SOLICITUDES, { ...FILTROS_INICIALES, origen: "analista" }))).toEqual(["2", "3"]);
  });

  it("opcionesUnicas devuelve valores distintos, sin vacíos y ordenados", () => {
    const opciones = opcionesUnicas(SOLICITUDES, (s) => s.familiaDeCargo?.nombre);
    expect(opciones).toEqual(["Finanzas", "Ventas"]);
    expect(opcionesUnicas([], (s) => s.x)).toEqual([]);
  });
});
