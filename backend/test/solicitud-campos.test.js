// Campos nuevos de la solicitud: resultado final, fecha de evaluación y mensaje adicional.
// Sin base de datos: los modelos se reemplazan por dobles y el esquema se valida en memoria.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Solicitud from "../src/models/Solicitud.js";
import Candidato from "../src/models/Candidato.js";
import FamiliaDeCargo from "../src/models/FamiliaDeCargo.js";
import Usuario from "../src/models/Usuario.js";
import solicitudRoutes from "../src/routes/solicitudRoutes.js";
import { actualizarEstadoSolicitud, actualizarSolicitud, crearSolicitud } from "../src/controllers/solicitudController.js";
import { crearPostulacion } from "../src/controllers/postulacionController.js";
import {
  MAX_MENSAJE_ADICIONAL,
  MENSAJE_FECHA_INVALIDA,
  MENSAJE_MENSAJE_LARGO,
  interpretarFechaEvaluacion,
  limpiarMensajeAdicional,
} from "../src/utils/datosSolicitud.js";

function respuestaFalsa() {
  const respuesta = {
    estado: 200,
    cuerpo: undefined,
    status(valor) {
      respuesta.estado = valor;
      return respuesta;
    },
    json(valor) {
      respuesta.cuerpo = valor;
      return respuesta;
    },
  };
  return respuesta;
}

// Solicitud de mentira con el mínimo que usa actualizarEstadoSolicitud.
function solicitudFalsa(datos = {}) {
  const solicitud = {
    estado: "En proceso",
    resultado: null,
    profesionalResponsable: "u-eva",
    guardada: 0,
    async save() {
      solicitud.guardada += 1;
    },
    async populate() {
      return solicitud;
    },
    ...datos,
  };
  return solicitud;
}

async function conSolicitud(solicitud, ejecutar) {
  const original = Solicitud.findById;
  Solicitud.findById = async () => solicitud;
  try {
    await ejecutar();
  } finally {
    Solicitud.findById = original;
  }
}

async function cambiarEstado(cuerpo) {
  const respuesta = respuestaFalsa();
  await actualizarEstadoSolicitud({ params: { id: "s1" }, body: cuerpo }, respuesta);
  return respuesta;
}

describe("interpretarFechaEvaluacion", () => {
  test("frontend conserva hora local en Santiago en verano/invierno y rechaza el salto DST", () => {
    const modulo = new URL("../../frontend/src/utils/fechas.js", import.meta.url).href;
    execFileSync(process.execPath, ["--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import { aValorDatetimeLocal, desdeValorDatetimeLocal } from ${JSON.stringify(modulo)};
      assert.equal(desdeValorDatetimeLocal('2026-11-05T10:30'), '2026-11-05T13:30:00.000Z');
      assert.equal(desdeValorDatetimeLocal('2026-07-05T10:30'), '2026-07-05T14:30:00.000Z');
      assert.equal(aValorDatetimeLocal('2026-11-05T13:30:00Z'), '2026-11-05T10:30');
      assert.equal(aValorDatetimeLocal('2026-07-05T14:30:00Z'), '2026-07-05T10:30');
      assert.equal(desdeValorDatetimeLocal('2026-09-06T00:30'), null);
      assert.equal(aValorDatetimeLocal('2026-04-05T03:30:00Z'), '2026-04-04T23:30');
      assert.equal(aValorDatetimeLocal('2026-04-05T02:30:00Z'), '2026-04-04T23:30');
    `], { env: { ...process.env, TZ: "America/Santiago" }, stdio: "pipe" });
  });
  test("rechaza días inexistentes sin normalizarlos a otro mes", () => {
    for (const valor of ["2026-02-29", "2026-02-30T10:30:00Z", "2026-04-31T10:30-03:00", "2024-02-30", "2026-11-05T24:00:00Z"]) {
      assert.deepEqual(interpretarFechaEvaluacion(valor), { error: MENSAJE_FECHA_INVALIDA });
    }
    assert.ok(interpretarFechaEvaluacion("2024-02-29T10:30:00Z").fecha instanceof Date);
  });
  test("acepta fecha con hora en ISO, con o sin zona horaria, y solo fecha", () => {
    assert.equal(interpretarFechaEvaluacion("2026-11-05T13:30:00.000Z").fecha.toISOString(), "2026-11-05T13:30:00.000Z");
    assert.ok(interpretarFechaEvaluacion("2026-11-05T10:30").fecha instanceof Date);
    assert.ok(interpretarFechaEvaluacion("2026-11-05T10:30:00-03:00").fecha instanceof Date);
    assert.ok(interpretarFechaEvaluacion("2026-11-05").fecha instanceof Date);
  });

  test("sin el campo no se toca (omitida); vacío o null la quitan", () => {
    assert.deepEqual(interpretarFechaEvaluacion(undefined), { omitida: true });
    assert.deepEqual(interpretarFechaEvaluacion(""), { fecha: null });
    assert.deepEqual(interpretarFechaEvaluacion("   "), { fecha: null });
    assert.deepEqual(interpretarFechaEvaluacion(null), { fecha: null });
  });

  test("rechaza textos que no son fecha, fechas imposibles, años fuera de rango y tipos raros", () => {
    for (const valor of ["mañana", "2026-13-45", "2026-11-05T25:99", "05/11/2026", "2026-11-05 10:30", "1999-12-31", "2101-01-01", 123, {}, []]) {
      assert.deepEqual(interpretarFechaEvaluacion(valor), { error: MENSAJE_FECHA_INVALIDA }, String(JSON.stringify(valor)));
    }
  });
});

describe("limpiarMensajeAdicional", () => {
  test("conserva los saltos de línea y limita las líneas en blanco seguidas", () => {
    assert.equal(limpiarMensajeAdicional("Hola\r\n\r\n\r\n\r\nQuiero postular"), "Hola\n\nQuiero postular");
    assert.equal(limpiarMensajeAdicional("  línea 1 \n línea   2  "), "línea 1\nlínea 2");
  });

  test("quita etiquetas HTML y caracteres de control", () => {
    assert.equal(limpiarMensajeAdicional("<b>Hola</b><script>x</script> mundo\u0007"), "Holax mundo");
  });

  test("lo que no es texto queda vacío", () => {
    for (const valor of [undefined, null, 5, {}]) assert.equal(limpiarMensajeAdicional(valor), "");
  });

  test("no recorta: devuelve el texto completo para que el controlador lo rechace si es muy largo", () => {
    assert.equal(limpiarMensajeAdicional("a".repeat(900)).length, 900);
  });
});

describe("esquema de Solicitud", () => {
  const base = {
    candidato: new mongoose.Types.ObjectId(),
    familiaDeCargo: new mongoose.Types.ObjectId(),
    cargo: "Operador de Planta",
  };

  test("una solicitud antigua, sin los campos nuevos, queda con valores neutros y es válida", () => {
    const solicitud = new Solicitud(base);
    assert.equal(solicitud.validateSync(), undefined);
    assert.equal(solicitud.resultado, null);
    assert.equal(solicitud.fechaEvaluacion, null);
    assert.equal(solicitud.mensajeAdicional, "");
    assert.equal(solicitud.estado, "Pendiente");
  });

  test("resultado solo admite Aprobada, Rechazada o null", () => {
    for (const valido of ["Aprobada", "Rechazada", null]) {
      assert.equal(new Solicitud({ ...base, resultado: valido }).validateSync(), undefined, String(valido));
    }
    assert.ok(new Solicitud({ ...base, resultado: "Pendiente" }).validateSync().errors.resultado);
  });

  test("el mensaje adicional admite 800 caracteres y rechaza 801", () => {
    assert.equal(new Solicitud({ ...base, mensajeAdicional: "a".repeat(MAX_MENSAJE_ADICIONAL) }).validateSync(), undefined);
    assert.ok(new Solicitud({ ...base, mensajeAdicional: "a".repeat(MAX_MENSAJE_ADICIONAL + 1) }).validateSync().errors.mensajeAdicional);
  });

  test("la fecha de evaluación guarda un instante y una fecha inválida no es válida", () => {
    const solicitud = new Solicitud({ ...base, fechaEvaluacion: "2026-11-05T13:30:00.000Z" });
    assert.equal(solicitud.fechaEvaluacion.toISOString(), "2026-11-05T13:30:00.000Z");
    assert.ok(new Solicitud({ ...base, fechaEvaluacion: "no-es-fecha" }).validateSync().errors.fechaEvaluacion);
  });
});

describe("actualizarEstadoSolicitud: resultado final", () => {
  test("al finalizar con resultado lo guarda", async () => {
    const solicitud = solicitudFalsa();
    await conSolicitud(solicitud, async () => {
      const respuesta = await cambiarEstado({ estado: "Finalizada", resultado: "Aprobada" });
      assert.equal(respuesta.estado, 200);
    });
    assert.equal(solicitud.estado, "Finalizada");
    assert.equal(solicitud.resultado, "Aprobada");
    assert.equal(solicitud.guardada, 1);
  });

  test("finalizar sin resultado lo deja pendiente (null)", async () => {
    const solicitud = solicitudFalsa();
    await conSolicitud(solicitud, async () => {
      await cambiarEstado({ estado: "Finalizada" });
    });
    assert.equal(solicitud.estado, "Finalizada");
    assert.equal(solicitud.resultado, null);
  });

  test("ya finalizada, marcar de nuevo solo el estado conserva el resultado; null lo quita; otro valor lo cambia", async () => {
    const solicitud = solicitudFalsa({ estado: "Finalizada", resultado: "Rechazada" });
    await conSolicitud(solicitud, async () => {
      await cambiarEstado({ estado: "Finalizada" });
      assert.equal(solicitud.resultado, "Rechazada");
      await cambiarEstado({ estado: "Finalizada", resultado: "Aprobada" });
      assert.equal(solicitud.resultado, "Aprobada");
      await cambiarEstado({ estado: "Finalizada", resultado: null });
      assert.equal(solicitud.resultado, null);
    });
  });

  test("un resultado fuera de la lista se rechaza con 400 y no guarda", async () => {
    const solicitud = solicitudFalsa();
    await conSolicitud(solicitud, async () => {
      const respuesta = await cambiarEstado({ estado: "Finalizada", resultado: "Quizás" });
      assert.equal(respuesta.estado, 400);
      assert.match(respuesta.cuerpo.mensaje, /Aprobada, Rechazada/);
    });
    assert.equal(solicitud.guardada, 0);
    assert.equal(solicitud.resultado, null);
  });

  test("el resultado no se puede registrar mientras la solicitud no esté finalizada", async () => {
    for (const estado of ["Pendiente", "En proceso"]) {
      const solicitud = solicitudFalsa();
      await conSolicitud(solicitud, async () => {
        const respuesta = await cambiarEstado({ estado, resultado: "Aprobada" });
        assert.equal(respuesta.estado, 400, estado);
        assert.match(respuesta.cuerpo.mensaje, /solo se puede registrar en solicitudes finalizadas/);
      });
      assert.equal(solicitud.guardada, 0, estado);
    }
  });

  test("al salir de Finalizada el resultado se borra", async () => {
    const solicitud = solicitudFalsa({ estado: "Finalizada", resultado: "Aprobada" });
    await conSolicitud(solicitud, async () => {
      await cambiarEstado({ estado: "En proceso" });
    });
    assert.equal(solicitud.estado, "En proceso");
    assert.equal(solicitud.resultado, null);
  });

  test("una solicitud antigua (sin el campo resultado) se mueve de estado sin problema", async () => {
    const solicitud = solicitudFalsa();
    delete solicitud.resultado;
    await conSolicitud(solicitud, async () => {
      const respuesta = await cambiarEstado({ estado: "Finalizada" });
      assert.equal(respuesta.estado, 200);
    });
    // Sin el campo guardado se lee como "sin resultado" (en MongoDB el esquema lo entrega como null).
    assert.equal(solicitud.resultado ?? null, null);
  });

  test("sin evaluador no se puede finalizar, con o sin resultado", async () => {
    const solicitud = solicitudFalsa({ profesionalResponsable: null });
    await conSolicitud(solicitud, async () => {
      const respuesta = await cambiarEstado({ estado: "Finalizada", resultado: "Aprobada" });
      assert.equal(respuesta.estado, 400);
      assert.match(respuesta.cuerpo.mensaje, /Asigna un evaluador/);
    });
    assert.equal(solicitud.guardada, 0);
  });
});

describe("fecha de evaluación en crear y actualizar solicitud", () => {
  const cuerpoBase = {
    candidatoNombre: "Diego Pérez",
    candidatoCorreo: "diego@ejemplo.cl",
    candidatoTelefono: "+56 9 1234 5678",
    familiaDeCargo: new mongoose.Types.ObjectId().toString(),
    cargo: "Operador de Planta",
    profesionalResponsable: new mongoose.Types.ObjectId().toString(),
  };

  test("PUT preserva fecha omitida, resultado, mensaje y archivos; vacío/null quitan solo la fecha", async (t) => {
    const fecha = new Date("2026-11-05T13:30:12.345Z");
    const candidato = {
      cvArchivoId: "cv-actual", informeArchivoId: "informe-actual",
      async validate() {}, async save() {},
    };
    t.mock.method(Candidato, "findById", async () => candidato);
    t.mock.method(FamiliaDeCargo, "findById", async () => ({}));
    t.mock.method(Usuario, "findById", async () => ({ rol: "evaluador" }));
    const solicitud = solicitudFalsa({ fechaEvaluacion: fecha, estado: "Finalizada", resultado: "Aprobada", mensajeAdicional: "Hola\nEquipo", cvUrl: "cv-antiguo" });
    await conSolicitud(solicitud, async () => {
      for (const extra of [{}, { fechaEvaluacion: "" }, { fechaEvaluacion: null }]) {
        const respuesta = respuestaFalsa();
        await actualizarSolicitud({ params: { id: "s1" }, body: { ...cuerpoBase, ...extra } }, respuesta);
        assert.equal(respuesta.estado, 200);
        assert.equal(solicitud.fechaEvaluacion, "fechaEvaluacion" in extra ? null : fecha);
        assert.equal(solicitud.resultado, "Aprobada");
        assert.equal(solicitud.mensajeAdicional, "Hola\nEquipo");
        assert.equal(solicitud.cvUrl, "cv-antiguo");
        assert.equal(candidato.cvArchivoId, "cv-actual");
        assert.equal(candidato.informeArchivoId, "informe-actual");
      }
    });
  });

  test("crear con una fecha inválida responde 400 antes de tocar la base de datos", async () => {
    const respuesta = respuestaFalsa();
    await crearSolicitud({ body: { ...cuerpoBase, fechaEvaluacion: "mañana" }, usuario: { id: "u1", rol: "analista" } }, respuesta);
    assert.equal(respuesta.estado, 400);
    assert.equal(respuesta.cuerpo.mensaje, MENSAJE_FECHA_INVALIDA);
  });

  test("actualizar con una fecha inválida responde 400 y no guarda", async () => {
    const solicitud = solicitudFalsa({ fechaEvaluacion: null });
    await conSolicitud(solicitud, async () => {
      const respuesta = respuestaFalsa();
      await actualizarSolicitud(
        { params: { id: "s1" }, body: { ...cuerpoBase, fechaEvaluacion: "2026-99-99T10:00" }, usuario: { id: "u1", rol: "analista" } },
        respuesta
      );
      assert.equal(respuesta.estado, 400);
      assert.equal(respuesta.cuerpo.mensaje, MENSAJE_FECHA_INVALIDA);
    });
    assert.equal(solicitud.guardada, 0);
  });
});

describe("mensaje adicional en la postulación pública", () => {
  const cuerpo = {
    nombre: "Camila Muñoz",
    correo: "camila@ejemplo.cl",
    telefono: "+56 9 1234 5678",
    cargo: "Ejecutivo de Ventas",
    familiaDeCargo: new mongoose.Types.ObjectId().toString(),
  };

  test("un mensaje de más de 800 caracteres se rechaza con 400 y un mensaje claro", async () => {
    const respuesta = respuestaFalsa();
    await crearPostulacion({ body: { ...cuerpo, mensajeAdicional: "a".repeat(MAX_MENSAJE_ADICIONAL + 1) } }, respuesta);
    assert.equal(respuesta.estado, 400);
    assert.equal(respuesta.cuerpo.mensaje, MENSAJE_MENSAJE_LARGO);
  });

  test("la validación del mensaje ocurre sobre el texto limpio (las etiquetas no cuentan)", async () => {
    // 800 caracteres reales más etiquetas que se eliminan: no debe rechazarse por el largo.
    const respuesta = respuestaFalsa();
    await crearPostulacion({ body: { ...cuerpo, mensajeAdicional: `<b>${"a".repeat(MAX_MENSAJE_ADICIONAL)}</b>` } }, respuesta);
    assert.notEqual(respuesta.cuerpo?.mensaje, MENSAJE_MENSAJE_LARGO);
  });

  test("sin mensaje la postulación sigue pasando esta validación (el CV es lo siguiente que se revisa)", async () => {
    const respuesta = respuestaFalsa();
    await crearPostulacion({ body: cuerpo }, respuesta);
    assert.equal(respuesta.estado, 400);
    assert.match(respuesta.cuerpo.mensaje, /CV/);
  });
});

describe("permisos de las rutas de solicitudes", () => {
  async function conServidor(ejecutar) {
    const secretoAnterior = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "secreto-solo-pruebas";
    const app = express();
    app.use(express.json());
    app.use(solicitudRoutes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    try {
      await ejecutar(`http://127.0.0.1:${server.address().port}`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      if (secretoAnterior === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = secretoAnterior;
    }
  }

  const token = (rol) => jwt.sign({ id: `u-${rol}`, rol }, "secreto-solo-pruebas");
  const pedir = (url, ruta, metodo, rol, cuerpo) =>
    fetch(`${url}${ruta}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(rol ? { Authorization: `Bearer ${token(rol)}` } : {}) },
      body: JSON.stringify(cuerpo),
    });

  test("el evaluador no puede marcar el resultado ni cambiar la fecha; sin sesión tampoco", async () => {
    await conServidor(async (url) => {
      const resultado = { estado: "Finalizada", resultado: "Aprobada" };
      assert.equal((await pedir(url, "/s1/estado", "PATCH", "evaluador", resultado)).status, 403);
      assert.equal((await pedir(url, "/s1/estado", "PATCH", null, resultado)).status, 401);
      assert.equal((await pedir(url, "/s1", "PUT", "evaluador", { fechaEvaluacion: "2026-11-05T10:00" })).status, 403);
    });
  });

  test("el analista y el admin sí pasan el control de permisos para marcar el resultado", async () => {
    const solicitud = solicitudFalsa();
    await conSolicitud(solicitud, async () => {
      await conServidor(async (url) => {
        for (const rol of ["analista", "admin"]) {
          const respuesta = await pedir(url, "/s1/estado", "PATCH", rol, { estado: "Finalizada", resultado: "Rechazada" });
          assert.equal(respuesta.status, 200, rol);
          assert.equal((await respuesta.json()).resultado, "Rechazada");
        }
      });
    });
  });
});
