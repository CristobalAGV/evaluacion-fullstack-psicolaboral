import assert from "node:assert/strict";
import { test } from "node:test";
import { antecedentesPermitidos, calcularPreseleccion, validarCamposPreseleccion } from "../src/utils/preseleccion.js";

const oferta = {
  requisitosEstructurados: {
    nivelEstudios: "tecnico", carreras: ["Administración"], experienciaAnios: 1,
    conocimientos: ["Excel intermedio"], certificaciones: ["Seguridad"], licencia: true,
    disponibilidad: true, modalidades: ["híbrida"],
  },
  requisitosDeseables: { conocimientos: ["SAP"], industrias: ["Acuícola"] },
};
const declarados = {
  nivelEstudios: "profesional", carrera: "administracion", experienciaAnios: 2,
  conocimientos: [" EXCEL   INTERMEDIO "], certificaciones: ["Seguridad"], licencia: true,
  disponibilidad: true, modalidades: ["híbrida", "remota"],
};

test("cumple los excluyentes, normaliza texto y puntúa deseables por separado", () => {
  const resultado = calcularPreseleccion(oferta, declarados);
  assert.equal(resultado.estadoPreseleccion, "cumple");
  assert.equal(resultado.porcentajeCoincidencia, 80);
  assert.deepEqual(resultado.requisitosSinInformacion, ["Experiencia en industria: Acuícola"]);
  assert.equal(calcularPreseleccion(oferta, { ...declarados, industrias: ["acuicola"] }).porcentajeCoincidencia, 90);
  assert.deepEqual(resultado.requisitosAplicados.excluyentes, oferta.requisitosEstructurados);
});

test("un incumplimiento de estudios o experiencia tiene prioridad sobre información incompleta", () => {
  for (const cambio of [{ nivelEstudios: "media" }, { experienciaAnios: 0 }]) {
    const resultado = calcularPreseleccion(oferta, { ...declarados, licencia: undefined, ...cambio });
    assert.equal(resultado.estadoPreseleccion, "no_cumple");
    assert.equal(resultado.porcentajeCoincidencia, 60);
    assert.ok(resultado.requisitosSinInformacion.includes("Licencia de conducir"));
  }
  assert.equal(calcularPreseleccion(oferta, { ...declarados, licencia: false }).estadoPreseleccion, "no_cumple");
});

test("la ausencia de un dato excluyente pide revisión y un deseable ausente no descarta", () => {
  assert.equal(calcularPreseleccion(oferta, {}).estadoPreseleccion, "revision");
  assert.equal(calcularPreseleccion({ requisitosDeseables: { industrias: ["Acuícola"] } }, {}).estadoPreseleccion, "cumple");
  assert.equal(calcularPreseleccion({}, declarados), null);
});

test("solo acepta antecedentes laborales, conserva respuestas negativas y rechaza tipos inválidos", () => {
  const datos = validarCamposPreseleccion({
    edad: 22, sexo: "X", nacionalidad: "Z", religion: "Y", estadoCivil: "Z",
    licencia: false, experienciaAnios: 0, certificaciones: [], conocimientos: [" Excel ", "Éxcel"],
  }, antecedentesPermitidos);
  assert.deepEqual(datos, { licencia: false, experienciaAnios: 0, certificaciones: [], conocimientos: ["Éxcel"] });
  assert.throws(() => validarCamposPreseleccion([], antecedentesPermitidos), /inválidos/);
  assert.throws(() => validarCamposPreseleccion({ experienciaAnios: "1" }, antecedentesPermitidos), /experienciaAnios/);
  assert.throws(() => validarCamposPreseleccion({ modalidades: ["otra"] }, antecedentesPermitidos), /modalidades/);
});
