// Pruebas de los reintentos ante 503 y del modelo de respaldo en servicioIa.js, con Gemini
// simulado: fetch se reemplaza por una cola de respuestas y nunca se sale a internet.
// Ejecutar con: npm test (desde backend/).
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { generarBorradorInforme, esperasDeReintento, ErrorIa } from "../src/services/servicioIa.js";

const MENSAJE_ALTA_DEMANDA = /alta demanda/;
const fetchOriginal = globalThis.fetch;
const warnOriginal = console.warn;
let llamadas;
let avisos;

function respuestaExitosa(contenido = { secciones: [{ titulo: "Fortalezas", contenido: "Comunicación clara." }] }) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(contenido) }] }, finishReason: "STOP" }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const respuestaError = (status) => new Response(JSON.stringify({ error: { code: status } }), { status });

// Cada llamada a fetch consume la siguiente respuesta de la cola y queda registrada.
function simularGemini(...respuestas) {
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url: String(url), clave: new Headers(opciones.headers).get("x-goog-api-key") });
    const siguiente = respuestas.shift();
    if (!siguiente) throw new Error("La prueba no esperaba otra llamada a Gemini");
    return typeof siguiente === "number" ? respuestaError(siguiente) : siguiente;
  };
}

const modeloDe = (llamada) => llamada.url.match(/\/models\/([^:]+):generateContent$/)?.[1];
const generar = () => generarBorradorInforme({ cargo: "Ejecutiva", familia: "Ventas", secciones: ["Fortalezas"], apuntes: "Apuntes", instrucciones: "" });

describe("servicioIa: reintentos ante 503 y modelo de respaldo", () => {
  beforeEach(() => {
    llamadas = [];
    avisos = [];
    console.warn = (mensaje) => avisos.push(String(mensaje));
    process.env.GEMINI_API_KEY = "clave-de-prueba";
    process.env.GEMINI_MODEL = "modelo-principal";
    process.env.GEMINI_ESPERAS_REINTENTO_MS = "0,0"; // 2 reintentos sin esperar
    delete process.env.GEMINI_MODEL_RESPALDO;
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    console.warn = warnOriginal;
  });

  test("503 y luego éxito: reintenta y responde con el modelo principal", async () => {
    simularGemini(503, respuestaExitosa());

    const resultado = await generar();

    assert.equal(llamadas.length, 2);
    assert.equal(resultado.modelo, "modelo-principal");
    assert.equal(resultado.secciones[0].contenido, "Comunicación clara.");
  });

  test("503 tres veces y luego el modelo de respaldo", async () => {
    process.env.GEMINI_MODEL_RESPALDO = "modelo-respaldo";
    simularGemini(503, 503, 503, respuestaExitosa());

    const resultado = await generar();

    assert.deepEqual(llamadas.map(modeloDe), ["modelo-principal", "modelo-principal", "modelo-principal", "modelo-respaldo"]);
    assert.equal(resultado.modelo, "modelo-respaldo");
  });

  test("503 en todo (también el respaldo): mensaje amable de alta demanda", async () => {
    process.env.GEMINI_MODEL_RESPALDO = "modelo-respaldo";
    simularGemini(503, 503, 503, 503);

    await assert.rejects(generar(), (error) => error instanceof ErrorIa && error.estado === 503 && MENSAJE_ALTA_DEMANDA.test(error.message));
    assert.equal(llamadas.length, 4);
  });

  test("un 429 NO se reintenta ni usa el respaldo", async () => {
    process.env.GEMINI_MODEL_RESPALDO = "modelo-respaldo";
    simularGemini(429);

    await assert.rejects(generar(), (error) => error.estado === 429 && /cuota/.test(error.message));
    assert.equal(llamadas.length, 1);
  });

  for (const [status, patron] of [
    [400, /error \(400\)/],
    [401, /autenticarse/],
    [404, /no esta disponible/],
  ]) {
    test(`un ${status} NO se reintenta ni usa el respaldo`, async () => {
      process.env.GEMINI_MODEL_RESPALDO = "modelo-respaldo";
      simularGemini(status);

      await assert.rejects(generar(), (error) => patron.test(error.message));
      assert.equal(llamadas.length, 1);
    });
  }

  test("sin respaldo definido: 3 intentos al principal y mensaje de alta demanda", async () => {
    simularGemini(503, 503, 503);

    await assert.rejects(generar(), (error) => error.estado === 503 && MENSAJE_ALTA_DEMANDA.test(error.message));
    assert.deepEqual(llamadas.map(modeloDe), ["modelo-principal", "modelo-principal", "modelo-principal"]);
  });

  test("si el respaldo falla con otro error, igual se responde alta demanda y queda en el log", async () => {
    process.env.GEMINI_MODEL_RESPALDO = "modelo-respaldo";
    simularGemini(503, 503, 503, 404);

    await assert.rejects(generar(), (error) => error.estado === 503 && MENSAJE_ALTA_DEMANDA.test(error.message));
    assert.ok(avisos.some((a) => a.includes("modelo-respaldo tambien fallo")));
  });

  test("un respaldo igual al principal no genera una llamada extra", async () => {
    process.env.GEMINI_MODEL_RESPALDO = "modelo-principal";
    simularGemini(503, 503, 503);

    await assert.rejects(generar(), (error) => error.estado === 503);
    assert.equal(llamadas.length, 3);
  });

  test("con GEMINI_ESPERAS_REINTENTO_MS vacía no hay reintentos (pero sí respaldo si está definido)", async () => {
    process.env.GEMINI_ESPERAS_REINTENTO_MS = "";
    process.env.GEMINI_MODEL_RESPALDO = "modelo-respaldo";
    simularGemini(503, respuestaExitosa());

    const resultado = await generar();

    assert.deepEqual(llamadas.map(modeloDe), ["modelo-principal", "modelo-respaldo"]);
    assert.equal(resultado.modelo, "modelo-respaldo");
  });

  test("sin reintentos ni respaldo: un solo intento", async () => {
    process.env.GEMINI_ESPERAS_REINTENTO_MS = "";
    simularGemini(503);

    await assert.rejects(generar(), (error) => error.estado === 503);
    assert.equal(llamadas.length, 1);
  });

  test("respeta las esperas configuradas entre reintentos", async () => {
    process.env.GEMINI_ESPERAS_REINTENTO_MS = "40,60";
    simularGemini(503, 503, respuestaExitosa());

    const inicio = Date.now();
    await generar();

    assert.ok(Date.now() - inicio >= 95, `esperó ${Date.now() - inicio} ms`);
    assert.equal(llamadas.length, 3);
  });

  test("sin clave configurada responde 503 sin llamar a Gemini ni reintentar", async () => {
    process.env.GEMINI_API_KEY = "";
    simularGemini();

    await assert.rejects(generar(), (error) => error.estado === 503 && /no esta configurado/.test(error.message));
    assert.equal(llamadas.length, 0);
  });

  test("la clave va solo en el header x-goog-api-key, nunca en la URL", async () => {
    simularGemini(respuestaExitosa());

    await generar();

    assert.equal(llamadas[0].clave, "clave-de-prueba");
    assert.ok(!llamadas[0].url.includes("clave-de-prueba") && !/[?&]key=/.test(llamadas[0].url));
  });
});

describe("esperasDeReintento", () => {
  afterEach(() => delete process.env.GEMINI_ESPERAS_REINTENTO_MS);

  test("por defecto: 2 s y luego 5 s", () => {
    delete process.env.GEMINI_ESPERAS_REINTENTO_MS;
    assert.deepEqual(esperasDeReintento(), [2000, 5000]);
  });

  test("se pueden acortar o desactivar", () => {
    process.env.GEMINI_ESPERAS_REINTENTO_MS = "0, 0";
    assert.deepEqual(esperasDeReintento(), [0, 0]);
    process.env.GEMINI_ESPERAS_REINTENTO_MS = "";
    assert.deepEqual(esperasDeReintento(), []);
  });

  test("ignora valores no válidos", () => {
    process.env.GEMINI_ESPERAS_REINTENTO_MS = "100,abc,-5,200";
    assert.deepEqual(esperasDeReintento(), [100, 200]);
  });
});
