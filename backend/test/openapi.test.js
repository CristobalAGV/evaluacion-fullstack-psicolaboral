import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import especificacion from "../src/openapi.js";

const fuente = (ruta) => readFile(new URL(ruta, import.meta.url), "utf8");
const metodos = "get|post|put|patch|delete";
function rutasDeclaradas(codigo, instancia, prefijo = "") {
  const patron = new RegExp(`\\b${instancia}\\.(${metodos})\\("([^"]+)"`, "g");
  return [...codigo.matchAll(patron)].map(([, metodo, ruta]) =>
    `${metodo.toUpperCase()} ${(prefijo + ruta.replace(/:(\w+)/g, "{$1}")).replace(/\/$/, "")}`);
}

test("OpenAPI cubre las rutas explícitas de Express y documenta parámetros, seguridad y respuestas", async () => {
  const app = await fuente("../src/app.js");
  const rutas = rutasDeclaradas(app, "app");
  for (const [, montaje, variable] of app.matchAll(/app\.use\("(\/api\/[^"]+)", (\w+)\)/g)) {
    const importacion = new RegExp(`import ${variable} from "(\\./routes/[^"]+)"`).exec(app);
    assert.ok(importacion, variable);
    rutas.push(...rutasDeclaradas(await fuente(`../src/${importacion[1]}`), "router", montaje));
  }
  assert.equal(especificacion.openapi, "3.0.3");
  assert.deepEqual(especificacion.security, [{ bearerAuth: [] }]);
  assert.equal(especificacion.components.securitySchemes.bearerAuth.scheme, "bearer");

  const documentadas = [];
  for (const [ruta, operaciones] of Object.entries(especificacion.paths)) {
    for (const [metodo, operacion] of Object.entries(operaciones)) {
      documentadas.push(`${metodo.toUpperCase()} /api${ruta}`);
      assert.ok(operacion.summary);
      assert.ok(Object.keys(operacion.responses).some((codigo) => /^2\d\d$/.test(codigo)));
      if (!operacion.security) assert.ok(operacion.responses[401]);
      for (const [, nombre] of ruta.matchAll(/\{(\w+)\}/g)) {
        assert.ok(operacion.parameters?.some((p) => p.name === nombre && p.in === "path" && p.required), ruta);
      }
      for (const respuesta of Object.values(operacion.responses)) assert.ok(respuesta.description);
    }
  }
  assert.deepEqual(documentadas.sort(), rutas.sort());

  function comprobarReferencias(nodo) {
    if (!nodo || typeof nodo !== "object") return;
    if (nodo.$ref) {
      const partes = nodo.$ref.slice(2).split("/");
      assert.ok(partes.reduce((actual, parte) => actual?.[parte], especificacion), nodo.$ref);
    }
    Object.values(nodo).forEach(comprobarReferencias);
  }
  comprobarReferencias(especificacion);
});
