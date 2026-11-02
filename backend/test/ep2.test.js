import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import authRoutes from "../src/routes/authRoutes.js";
import { registrar } from "../src/controllers/authController.js";
import Usuario from "../src/models/Usuario.js";

async function conServidor(router, ejecutar) {
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use((req, res) => res.status(404).json({ mensaje: "Ruta no encontrada" }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try { await ejecutar(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("registro requiere JWT válido y admin; rechaza crear admin", async () => {
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "secreto-solo-pruebas";
  try {
    await conServidor(authRoutes, async (url) => {
      for (const [rol, estado] of [[null, 401], ["invalido", 401], ["analista", 403], ["evaluador", 403], ["admin", 400]]) {
        const token = rol === "invalido" ? "invalido" : jwt.sign({ id: "u1", rol }, process.env.JWT_SECRET);
        const respuesta = await fetch(`${url}/registro`, { method: "POST", headers: { "Content-Type": "application/json", ...(rol ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ nombre: "Persona", correo: "p@ejemplo.cl", password: "secreto123", rol: "admin" }) });
        assert.equal(respuesta.status, estado);
      }
    });
  } finally { if (anterior === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = anterior; }
});

test("registro responde 201 con usuario y mensaje sin token", async () => {
  const findOne = Usuario.findOne;
  const create = Usuario.create;
  Usuario.findOne = async () => null;
  Usuario.create = async (datos) => ({ _id: "nuevo", ...datos });
  try {
    for (const rol of ["analista", "evaluador"]) {
      let estado;
      let cuerpo;
      await registrar({ body: { nombre: "Persona", correo: "p@ejemplo.cl", password: "secreto123", rol } }, { status(valor) { estado = valor; return this; }, json(valor) { cuerpo = valor; } });
      assert.equal(estado, 201);
      assert.equal(cuerpo.usuario.rol, rol);
      assert.ok(cuerpo.mensaje);
      assert.equal("token" in cuerpo, false);
    }
  } finally { Usuario.findOne = findOne; Usuario.create = create; }
});

test("solo true registra las seis rutas IA y conserva entrevista/evaluaciones", async () => {
  const anterior = process.env.IA_HABILITADA;
  try {
    for (const valor of [undefined, "false", "TRUE", "1", "true"]) {
      if (valor === undefined) delete process.env.IA_HABILITADA; else process.env.IA_HABILITADA = valor;
      const { default: router } = await import(`../src/routes/solicitudRoutes.js?flag=${valor}`);
      const rutas = router.stack.filter((capa) => capa.route).map((capa) => capa.route.path);
      assert.equal(rutas.filter((ruta) => ruta.includes("/informe") && !ruta.includes("informe-entrevista")).length, valor === "true" ? 6 : 0);
      assert.ok(rutas.includes("/:id/informe-entrevista"));
      assert.ok(rutas.includes("/:id/evaluaciones"));
      if (valor !== "true") {
        const app = express();
        app.use((req, res, next) => { req.headers.authorization = `Bearer ${jwt.sign({ id: "u1", rol: "admin" }, "prueba")}`; next(); });
        app.use(router);
        const secreto = process.env.JWT_SECRET;
        process.env.JWT_SECRET = "prueba";
        try {
          await conServidor(app, async (url) => {
            for (const [metodo, ruta] of [["GET", "informe"], ["POST", "informe/generar"], ["PUT", "informe"], ["GET", "informe/evaluacion"], ["POST", "informe/evaluacion/generar"], ["PUT", "informe/evaluacion"]]) {
              const respuesta = await fetch(`${url}/s1/${ruta}`, { method: metodo });
              assert.equal(respuesta.status, 404);
              assert.deepEqual(await respuesta.json(), { mensaje: "Ruta no encontrada" });
            }
          });
        } finally { if (secreto === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secreto; }
      }
    }
  } finally { if (anterior === undefined) delete process.env.IA_HABILITADA; else process.env.IA_HABILITADA = anterior; }
});
