import assert from "node:assert/strict";
import { test } from "node:test";
import { obtenerVerificaciones } from "../src/utils/preguntasVerificacion.js";

test("cubre cada excluyente pertinente y distingue datos ausentes de incumplimientos", () => {
  const requisitos = [
    "Experiencia mínima: 1 años", "Nivel mínimo de estudios: tecnico", "Carrera aceptada: Administración",
    "Conocimiento: Excel", "Certificación: Operación de grúa", "Licencia de conducir",
    "Disponibilidad para el cargo", "Modalidad aceptada: híbrida", "Criterio laboral anterior",
  ];
  const criterios = requisitos.map((requisito, i) => ({
    grupo: "excluyente", requisito, resultado: i === 3 ? "no_cumplido" : "sin_informacion",
  }));
  const preguntas = obtenerVerificaciones({ estadoPreseleccion: "revision", criterios: [
    ...criterios, criterios[0],
    { grupo: "excluyente", requisito: "Conocimiento: Estado civil", resultado: "sin_informacion" },
    { grupo: "deseable", requisito: "Conocimiento deseable: SAP", resultado: "sin_informacion" },
    { grupo: "excluyente", requisito: "Conocimiento: Power BI", resultado: "cumplido" },
  ] });
  assert.deepEqual(preguntas.map(({ requisito }) => requisito), requisitos);
  assert.deepEqual(preguntas.map(({ tipo }) => tipo), [
    "experiencia", "estudios", "estudios", "conocimiento", "certificacion",
    "licencia", "disponibilidad", "disponibilidad", "otro",
  ]);
  assert.equal(preguntas[0].motivo, "Pendiente");
  assert.equal(preguntas[3].motivo, "No cumple");
  assert.match(preguntas[3].pregunta, /equivalentes/);
  assert.deepEqual(obtenerVerificaciones({ estadoPreseleccion: "cumple", criterios }), []);
  assert.deepEqual(obtenerVerificaciones({ estadoPreseleccion: "revision" }), []);
});

test("conserva verificaciones para herramientas distintas que usan puntuación", () => {
  const preguntas = obtenerVerificaciones({ estadoPreseleccion: "revision", criterios: ["C#", "C++"].map((herramienta) => ({
    grupo: "excluyente", resultado: "sin_informacion", requisito: `Conocimiento: ${herramienta}`,
  })) });
  assert.equal(preguntas.length, 2);
  assert.match(preguntas[0].pregunta, /C#/);
  assert.match(preguntas[1].pregunta, /C\+\+/);
});
