// Competencias que se evalúan en cada familia de cargo. Salen de lo que mide la pauta de
// entrevista de cada familia (ver seed/generarPlantillas.js). La IA debe puntuar exactamente
// estas, en este orden.
const COMPETENCIAS_GENERALES = [
  "Comunicación",
  "Trabajo en equipo",
  "Tolerancia a la presión",
  "Resolución de problemas",
  "Experiencia relacionada con el cargo",
];

const COMPETENCIAS_POR_FAMILIA = {
  "atencion al cliente": [
    "Orientación al cliente",
    "Manejo de reclamos y situaciones difíciles",
    "Comunicación",
    "Tolerancia a la presión",
    "Experiencia en atención de público",
  ],
  ventas: [
    "Orientación a resultados",
    "Negociación y cierre de ventas",
    "Manejo del rechazo",
    "Comunicación",
    "Experiencia en ventas",
  ],
  administracion: [
    "Organización y planificación",
    "Rigurosidad y manejo de documentación",
    "Dominio de herramientas administrativas",
    "Comunicación",
    "Experiencia administrativa",
  ],
  operaciones: [
    "Coordinación de procesos operativos",
    "Respuesta ante imprevistos",
    "Mejora continua",
    "Trabajo en equipo",
    "Experiencia en operaciones o logística",
  ],
};

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function obtenerCompetenciasDeFamilia(familia) {
  return COMPETENCIAS_POR_FAMILIA[normalizar(familia?.nombre)] ?? COMPETENCIAS_GENERALES;
}
