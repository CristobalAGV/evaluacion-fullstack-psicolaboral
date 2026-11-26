const NIVELES = ["media", "tecnico", "profesional", "postgrado"];
const MODALIDADES = ["presencial", "híbrida", "remota"];
const texto = (v) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= 100;
const lista = (validar = texto) => (v) => Array.isArray(v) && v.length <= 20 && v.every(validar);
const anios = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 70;
const booleano = (v) => typeof v === "boolean";
const nivel = (v) => NIVELES.includes(v);
const modalidades = lista((v) => MODALIDADES.includes(v));

export const exclusiones = {
  nivelEstudios: nivel, carreras: lista(), experienciaAnios: anios, conocimientos: lista(),
  certificaciones: lista(), licencia: booleano, modalidades, disponibilidad: booleano,
};
export const deseables = { conocimientos: lista(), industrias: lista() };
export const antecedentesPermitidos = {
  nivelEstudios: nivel, carrera: texto, experienciaAnios: anios, conocimientos: lista(),
  certificaciones: lista(), licencia: booleano, modalidades, disponibilidad: booleano, industrias: lista(),
};

export function validarCamposPreseleccion(datos, permitidos) {
  if (datos === undefined) return {};
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw new TypeError("Datos de preselección inválidos.");
  const salida = {};
  for (const [campo, valida] of Object.entries(permitidos)) {
    const valor = datos[campo];
    if (valor === undefined || valor === null) continue;
    if (!valida(valor)) throw new TypeError(`Valor inválido en preselección: ${campo}.`);
    salida[campo] = Array.isArray(valor) ? [...new Map(valor.map((item) => [normalizar(item), item.trim()])).values()]
      : typeof valor === "string" ? valor.trim() : valor;
  }
  return salida;
}

function normalizar(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function calcularPreseleccion(oferta, antecedentes = {}) {
  const requisitos = oferta.requisitosEstructurados ?? {};
  const preferidos = oferta.requisitosDeseables ?? {};
  const criterios = [];
  function agregar(grupo, requisito, declarado, cumple) {
    criterios.push({ grupo, requisito, resultado: declarado === undefined
      ? "sin_informacion" : cumple(declarado) ? "cumplido" : "no_cumplido" });
  }
  if (requisitos.nivelEstudios) agregar("excluyente", `Nivel mínimo de estudios: ${requisitos.nivelEstudios}`,
    antecedentes.nivelEstudios, (v) => NIVELES.indexOf(v) >= NIVELES.indexOf(requisitos.nivelEstudios));
  if (requisitos.carreras?.length) agregar("excluyente", `Carrera aceptada: ${requisitos.carreras.join(" o ")}`,
    antecedentes.carrera, (v) => requisitos.carreras.some((carrera) => normalizar(carrera) === normalizar(v)));
  if (requisitos.experienciaAnios != null) agregar("excluyente", `Experiencia mínima: ${requisitos.experienciaAnios} años`,
    antecedentes.experienciaAnios, (v) => v >= requisitos.experienciaAnios);
  if (requisitos.licencia) agregar("excluyente", "Licencia de conducir", antecedentes.licencia, Boolean);
  if (requisitos.disponibilidad) agregar("excluyente", "Disponibilidad para el cargo", antecedentes.disponibilidad, Boolean);
  if (requisitos.modalidades?.length) agregar("excluyente", `Modalidad aceptada: ${requisitos.modalidades.join(" o ")}`,
    antecedentes.modalidades, (v) => requisitos.modalidades.some((item) => v.includes(item)));

  for (const [grupo, valores, campo, etiqueta] of [
    ["excluyente", requisitos.conocimientos, "conocimientos", "Conocimiento"],
    ["excluyente", requisitos.certificaciones, "certificaciones", "Certificación"],
    ["deseable", preferidos.conocimientos, "conocimientos", "Conocimiento deseable"],
    ["deseable", preferidos.industrias, "industrias", "Experiencia en industria"],
  ]) {
    for (const item of valores ?? []) agregar(grupo, `${etiqueta}: ${item}`, antecedentes[campo],
      (v) => v.some((declarado) => normalizar(declarado) === normalizar(item)));
  }
  if (!criterios.length) return null;
  const excluyentes = criterios.filter(({ grupo }) => grupo === "excluyente");
  const secundarios = criterios.filter(({ grupo }) => grupo === "deseable");
  const proporcion = (grupo) => grupo.filter(({ resultado }) => resultado === "cumplido").length / grupo.length;
  const estadoPreseleccion = excluyentes.some(({ resultado }) => resultado === "no_cumplido") ? "no_cumple"
    : excluyentes.some(({ resultado }) => resultado === "sin_informacion") ? "revision" : "cumple";
  return {
    estadoPreseleccion, criterios, requisitosAplicados: { excluyentes: requisitos, deseables: preferidos },
    porcentajeCoincidencia: Math.round(excluyentes.length && secundarios.length
      ? 80 * proporcion(excluyentes) + 20 * proporcion(secundarios) : 100 * proporcion(criterios)),
    requisitosCumplidos: criterios.filter(({ resultado }) => resultado === "cumplido").map(({ requisito }) => requisito),
    requisitosNoCumplidos: criterios.filter(({ resultado }) => resultado === "no_cumplido").map(({ requisito }) => requisito),
    requisitosSinInformacion: criterios.filter(({ resultado }) => resultado === "sin_informacion").map(({ requisito }) => requisito),
    fechaEvaluacionPrevia: new Date(), version: 1,
  };
}

export function requiereContinuidad(solicitud) {
  const resultado = solicitud.preseleccion;
  return Boolean(resultado && resultado.estadoPreseleccion !== "cumple" && !resultado.continuidad);
}
