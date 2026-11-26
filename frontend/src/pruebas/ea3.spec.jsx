import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { OfertasPublicas, DetalleOfertaPublica } from "../pages/OfertasPublicas";
import { FormularioOferta, GestionOfertas } from "../pages/GestionOfertas";
import PreguntasEntrevista from "../components/PreguntasEntrevista";
import api from "../services/api";

const familia = { _id: "familia-demo", nombre: "Operaciones" };
const oferta = {
  _id: "oferta-demo", cargo: "Operador ficticio", familiaDeCargo: familia, modalidad: "híbrida",
  cupos: 2, estado: "publicada", fechaPublicacion: "2026-01-01T12:00:00Z", ubicacion: "Puerto Montt",
  descripcion: "Vacante para la demostración", funciones: "Coordinar turnos", requisitos: "Logística",
  beneficios: "Capacitación", sueldo: "$1.000.000 CLP",
  area: "Producción", region: "Los Lagos", objetivo: "Asegurar continuidad de turnos.",
  experiencia: "Un año de experiencia", estudios: "Técnico industrial", conocimientos: "Control de procesos",
};

afterEach(cleanup);

function portal(ruta = "/ofertas") {
  return render(<MemoryRouter initialEntries={[ruta]}><Routes>
    <Route path="/ofertas" element={<OfertasPublicas />} />
    <Route path="/ofertas/:id" element={<DetalleOfertaPublica />} />
    <Route path="/ofertas/:id/postular" element={<DetalleOfertaPublica postular />} />
  </Routes></MemoryRouter>);
}

function gestion(ruta = "/gestion/ofertas") {
  return render(<MemoryRouter initialEntries={[ruta]}><Routes>
    <Route path="/gestion/ofertas" element={<GestionOfertas />} />
    <Route path="/gestion/ofertas/nueva" element={<FormularioOferta />} />
    <Route path="/gestion/ofertas/:id" element={<FormularioOferta />} />
  </Routes></MemoryRouter>);
}

it("busca y filtra por HTTP, muestra el detalle y postula con un CV vinculado a la oferta", async () => {
  const usuario = userEvent.setup();
  const get = vi.spyOn(api, "get").mockImplementation(async (url) => ({
    data: url.endsWith("/familias") ? [familia] : url.endsWith("/publicas") ? [oferta] : oferta,
  }));
  const post = vi.spyOn(api, "post").mockResolvedValue({ data: { mensaje: "Postulación recibida" } });
  portal();
  const nombreEnlace = `Ver oferta: ${oferta.cargo}`;
  await screen.findByRole("link", { name: nombreEnlace });
  expect(screen.getByText(oferta.descripcion)).toBeTruthy();
  await usuario.type(screen.getByLabelText("Cargo o palabra clave"), "Puerto");
  await usuario.selectOptions(screen.getByLabelText("Familia de cargo"), familia._id);
  await usuario.selectOptions(screen.getByLabelText("Área"), oferta.area);
  await usuario.selectOptions(screen.getByLabelText("Región"), oferta.region);
  await usuario.selectOptions(screen.getByLabelText("Modalidad"), oferta.modalidad);
  await usuario.click(screen.getByRole("button", { name: "Buscar" }));
  expect(get).toHaveBeenLastCalledWith("/ofertas/publicas", {
    params: { q: "Puerto", familia: familia._id, area: oferta.area, region: oferta.region, modalidad: oferta.modalidad },
  });
  await usuario.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(get).toHaveBeenLastCalledWith("/ofertas/publicas", { params: {} });
  await usuario.click(await screen.findByRole("link", { name: nombreEnlace }));
  expect(await screen.findByRole("heading", { name: "Beneficios" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Objetivo del cargo" })).toBeTruthy();
  expect(screen.getByText(oferta.conocimientos)).toBeTruthy();
  expect(screen.getByText(oferta.sueldo)).toBeTruthy();
  await usuario.click(screen.getByRole("link", { name: "Postular" }));
  await screen.findByRole("heading", { name: `Postula a ${oferta.cargo}` });
  expect(screen.queryByLabelText("Cargo al que postulas")).toBeNull();
  await usuario.type(screen.getByLabelText("Nombre completo"), "Camila Ficticia");
  await usuario.type(screen.getByLabelText("Correo"), "camila@example.invalid");
  await usuario.type(screen.getByLabelText("Teléfono"), "+56 9 0000 0000");
  await usuario.selectOptions(screen.getByLabelText("Nivel de estudios"), "tecnico");
  await usuario.type(screen.getByLabelText("Años de experiencia"), "0");
  await usuario.type(screen.getByLabelText(/^Conocimientos técnicos/), "Excel, SAP");
  await usuario.type(screen.getByLabelText(/^Certificaciones/), "Ninguno");
  await usuario.selectOptions(screen.getByLabelText("Licencia de conducir"), "no");
  await usuario.selectOptions(screen.getByLabelText("Modalidades disponibles"), ["presencial", "remota"]);
  const cv = new File(["%PDF-1.4"], "ejemplo.pdf", { type: "application/pdf" });
  await usuario.upload(screen.getByLabelText("CV", { exact: false, selector: "input" }), cv);
  await usuario.click(screen.getByRole("button", { name: "Enviar postulación" }));
  await waitFor(() => expect(post).toHaveBeenCalled());
  const [ruta, datos] = post.mock.calls[0];
  expect(ruta).toBe("/postulaciones");
  expect(datos.get("ofertaId")).toBe(oferta._id);
  expect(datos.get("cv").name).toBe(cv.name);
  expect(datos.has("cargo")).toBe(false);
  expect(JSON.parse(datos.get("antecedentes"))).toEqual({
    nivelEstudios: "tecnico", experienciaAnios: 0, conocimientos: ["Excel", "SAP"],
    certificaciones: [], licencia: false, modalidades: ["presencial", "remota"],
  });
});

it("precarga una oferta ficticia en el formulario y la guarda mediante la API", async () => {
  const usuario = userEvent.setup();
  vi.spyOn(api, "get").mockImplementation(async (ruta) => ({ data: ruta === "/familias" ? [familia] : [] }));
  const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
  gestion("/gestion/ofertas/nueva");
  await usuario.selectOptions(await screen.findByRole("combobox", { name: /cargar ejemplo ficticio/i }), "Analista de Operaciones");
  expect(screen.getByLabelText("Familia de cargo").value).toBe(familia._id);
  expect(screen.getByLabelText("Objetivo del cargo").value).toMatch(/desvíos operativos/);
  await usuario.click(screen.getByRole("button", { name: "Guardar oferta" }));
  expect(post).toHaveBeenCalledWith("/ofertas", expect.objectContaining({
    cargo: "Analista de Operaciones", area: "Producción", region: "Los Lagos", familiaDeCargo: familia._id,
    requisitosEstructurados: expect.objectContaining({ nivelEstudios: "tecnico", experienciaAnios: 1, conocimientos: ["Excel intermedio"] }),
    requisitosDeseables: expect.objectContaining({ industrias: ["acuícola"] }),
  }));
});

it("muestra resultados vacíos y una oferta retirada", async () => {
  vi.spyOn(api, "get").mockImplementation(async (ruta) => {
    if (ruta.endsWith("/familias")) throw new Error("no disponible");
    if (ruta.endsWith("/publicas")) return { data: [] };
    throw { response: { status: 404 } };
  });
  const portada = portal();
  expect(await screen.findByText(/no hay ofertas/i)).toBeTruthy();
  expect(await screen.findByRole("alert")).toBeTruthy();
  portada.unmount();
  portal("/ofertas/no-disponible");
  expect((await screen.findByRole("alert")).textContent).toMatch(/ya no está disponible/);
});

it("crea y edita ofertas; publica, despublica y archiva desde la gestión", async () => {
  const usuario = userEvent.setup();
  let registro = null;
  const get = vi.spyOn(api, "get").mockImplementation(async (ruta) => ({
    data: ruta === "/familias" ? [familia] : ruta === "/ofertas" ? (registro ? [registro] : []) : registro,
  }));
  const post = vi.spyOn(api, "post").mockImplementation(async (ruta, datos) => {
    registro = { ...oferta, ...datos, familiaDeCargo: familia, estado: "borrador" };
    return { data: registro };
  });
  const put = vi.spyOn(api, "put").mockImplementation(async (ruta, datos) => {
    registro = { ...registro, ...datos, familiaDeCargo: familia };
    return { data: registro };
  });
  const patch = vi.spyOn(api, "patch").mockImplementation(async (ruta, datos) => {
    registro = { ...registro, estado: datos.publicada ? "publicada" : "borrador" };
    return { data: registro };
  });
  const archivar = vi.spyOn(api, "delete").mockImplementation(async () => {
    registro = { ...registro, estado: "archivada" };
  });

  gestion();
  await screen.findByText("Aún no hay ofertas registradas.");
  await usuario.click(screen.getByRole("link", { name: "Nueva oferta" }));
  await usuario.selectOptions(await screen.findByLabelText("Familia de cargo"), familia._id);
  await usuario.selectOptions(screen.getByLabelText("Modalidad"), "híbrida");
  for (const [etiqueta, valor] of Object.entries({
    Cargo: oferta.cargo, Ubicación: oferta.ubicacion, "Sueldo o rango salarial": oferta.sueldo,
    Descripción: oferta.descripcion, "Funciones principales": oferta.funciones,
    Requisitos: oferta.requisitos, Beneficios: oferta.beneficios,
  })) {
    await usuario.type(screen.getByLabelText(etiqueta, { exact: true }), valor);
  }
  await usuario.click(screen.getByRole("button", { name: "Guardar oferta" }));
  await usuario.click(await screen.findByRole("link", { name: oferta.cargo }));
  const cupos = await screen.findByLabelText("Cupos");
  await usuario.clear(cupos);
  await usuario.type(cupos, "4");
  await usuario.click(screen.getByRole("button", { name: "Guardar oferta" }));
  await usuario.click(await screen.findByRole("button", { name: "Publicar" }));
  await usuario.click(await screen.findByRole("button", { name: "Despublicar" }));
  await usuario.click(await screen.findByRole("button", { name: "Archivar" }));
  await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
  await usuario.click(screen.getByRole("button", { name: "Archivar" }));
  await usuario.click(screen.getByRole("button", { name: "Confirmar archivo" }));
  expect(await screen.findByText(/Archivada/)).toBeTruthy();
  expect(post).toHaveBeenCalledWith("/ofertas", expect.objectContaining({ cupos: 1, cargo: oferta.cargo }));
  expect(get).toHaveBeenCalledWith(`/ofertas/${oferta._id}`);
  expect(put).toHaveBeenCalledWith(`/ofertas/${oferta._id}`, expect.objectContaining({ cupos: 4 }));
  expect(patch.mock.calls.map(([, datos]) => datos.publicada)).toEqual([true, false]);
  expect(archivar).toHaveBeenCalledWith(`/ofertas/${oferta._id}`);
});

it("muestra un error de publicación retornado por el backend", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: [oferta] });
  vi.spyOn(api, "patch").mockRejectedValue({ response: { data: { mensaje: "Oferta no encontrada" } } });
  const usuario = userEvent.setup();
  gestion();
  await usuario.click(await screen.findByRole("button", { name: "Despublicar" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Oferta no encontrada");
});

it("la IA solo se invoca por acción explícita y permite reintentar un error", async () => {
  const usuario = userEvent.setup();
  const pedir = vi.spyOn(api, "post").mockRejectedValueOnce(new Error("red"))
    .mockResolvedValueOnce({ data: { preguntas: ["¿Cómo priorizarías turnos?"] } });
  render(<PreguntasEntrevista id="solicitud-demo" />);
  expect(pedir).not.toHaveBeenCalled();
  expect(screen.getByText(/la decisión de selección es humana/i)).toBeTruthy();
  await usuario.click(screen.getByRole("button", { name: "Sugerir preguntas" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/no se pudieron generar/i);
  await usuario.click(screen.getByRole("button", { name: "Sugerir preguntas" }));
  expect(await screen.findByText("¿Cómo priorizarías turnos?")).toBeTruthy();
  expect(pedir).toHaveBeenCalledWith("/solicitudes/solicitud-demo/preguntas-entrevista/generar");
});

it("muestra las verificaciones locales con un aviso si Gemini falla", async () => {
  vi.spyOn(api, "post").mockResolvedValue({ data: {
    preguntas: [], aviso: "La IA no pudo generar preguntas generales.",
    preguntasVerificacion: [{ pregunta: "¿Qué puedes acreditar?", requisito: "Certificación", motivo: "Pendiente" }],
  } });
  render(<PreguntasEntrevista id="solicitud-demo" />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Sugerir preguntas" }));
  expect((await screen.findByRole("status")).textContent).toMatch(/no pudo generar/);
  expect(screen.getByText("Certificación · Pendiente")).toBeTruthy();
  expect(screen.getByText("¿Qué puedes acreditar?")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Preguntas generales" })).toBeNull();
});
