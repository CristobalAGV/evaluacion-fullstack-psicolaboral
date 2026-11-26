// Los prefijos coinciden con los criterios v1 persistidos en la solicitud.
const pautas = [
  [/^Experiencia mínima:/, "experiencia",
    "¿Qué trabajos, prácticas o proyectos relacionados con el cargo has realizado? Indica las actividades, su duración y tus responsabilidades.",
    "¿Qué responsabilidades has desarrollado y qué trabajos, prácticas o proyectos adicionales podrían complementar la experiencia declarada? Indica su duración."],
  [/^Nivel mínimo de estudios:/, "estudios",
    "¿Qué nivel de estudios has completado y cómo lo puedes acreditar?",
    "¿Qué formación complementaria o equivalente al requisito puedes acreditar para estas funciones?"],
  [/^Carrera aceptada:/, "estudios",
    "¿Cuál es tu título o carrera y cómo se relaciona con las funciones del cargo?",
    "¿Qué título equivalente puedes acreditar y cómo se relaciona con las funciones del cargo?"],
  [/^Conocimiento:/, "conocimiento",
    "Describe una situación laboral, práctica o proyecto en que aplicaste «{detalle}». ¿Qué hiciste y cómo comprobaste el resultado?",
    "¿Qué formación, herramientas equivalentes o experiencias adicionales puedes acreditar respecto a «{detalle}»?"],
  [/^Certificación:/, "certificacion", "¿Dispones de una certificación vigente para «{detalle}» o de una equivalente? ¿Cómo puedes acreditarla?"],
  [/^Licencia de conducir$/, "licencia", "¿Cuentas con la licencia de conducir requerida para estas funciones y está vigente?"],
  [/^Disponibilidad para el cargo$/, "disponibilidad", "¿Qué disponibilidad tienes para la jornada descrita en la oferta?"],
  [/^Modalidad aceptada:/, "disponibilidad", "¿Qué disponibilidad tienes para trabajar en alguna de las modalidades descritas en la oferta?"],
];

// Filtro conservador para textos sugeridos por IA o criterios redactados manualmente.
const atributosProtegidos = /\b(?:edad|cuantos anos tienes|fecha de nacimiento|ano naciste|religio\w*|creencias|estado civil|casad\w*|solter\w*|orientacion sexual|identidad de genero|sexo|genero|embaraz\w*|hijos?|planes familiares|maternidad|paternidad|estado de salud|condicion medica|discapacidad\w*|enfermedad\w*|diagnostico clinico|afiliacion politic\w*|partido politic\w*|afiliacion sindical|nacionalidad|etnia|raza|run|rut|domicilio)\b/;
const recomendacion = /\b(?:aprobar|rechazar|descartar|contratar|puntaje|puntuacion|calificacion)\b/;
const normalizarTexto = (texto) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export const normalizarPregunta = (texto) => normalizarTexto(texto).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const esLaboral = (texto) => !atributosProtegidos.test(normalizarPregunta(texto));
export const esPreguntaGeneralPermitida = (texto) => esLaboral(texto) && !recomendacion.test(normalizarPregunta(texto));

export function obtenerVerificaciones(preseleccion) {
  if (!["revision", "no_cumple"].includes(preseleccion?.estadoPreseleccion) || !Array.isArray(preseleccion.criterios)) return [];
  const vistos = new Set();
  return preseleccion.criterios.flatMap((criterio) => {
    const { grupo, resultado, requisito } = criterio ?? {};
    if (grupo !== "excluyente" || !["sin_informacion", "no_cumplido"].includes(resultado)
      || typeof requisito !== "string" || !requisito.trim() || !esLaboral(requisito)) return [];
    const clave = normalizarTexto(requisito).trim().replace(/\s+/g, " ");
    if (vistos.has(clave)) return [];
    vistos.add(clave);
    const [, tipo = "otro", pendiente = "¿Qué antecedentes laborales puedes presentar para acreditar el requisito indicado?", incumplido = pendiente]
      = pautas.find(([patron]) => patron.test(requisito)) ?? [];
    const faltaInformacion = resultado === "sin_informacion";
    const detalle = requisito.slice(requisito.indexOf(":") + 1).trim();
    return [{
      tipo, pregunta: (faltaInformacion ? pendiente : incumplido).replace("{detalle}", () => detalle), requisito,
      motivo: faltaInformacion ? "Pendiente" : "No cumple",
    }];
  });
}
