import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Document, Packer, Paragraph } from "docx";
import Archivo from "../src/models/Archivo.js";
import Candidato from "../src/models/Candidato.js";
import Familia from "../src/models/FamiliaDeCargo.js";
import Oferta from "../src/models/Oferta.js";
import Solicitud from "../src/models/Solicitud.js";
import Usuario from "../src/models/Usuario.js";
import { extraerTextoDeArchivo } from "../src/utils/extraerTextoArchivo.js";

const secreto = "jwt-exclusivo-de-la-suite-ficticia";
const password = "password-academica-ficticia";
const pdf = "%PDF-1.4\n% archivo sintético para probar el transporte";
const tipoWord = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const pdfReal = (() => {
  let contenido = "%PDF-1.4\n";
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
  ];
  const entradas = objetos.map((objeto, indice) => {
    const offset = contenido.length;
    contenido += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    return `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  return Buffer.from(contenido + `xref\n0 4\n0000000000 65535 f \n${entradas.join("")}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${contenido.length}\n%%EOF\n`);
})();
const nombre = "Camila Ficticia";
const correo = "camila@example.invalid";
const telefono = "+56 9 0000 0000";
const mongoDisponible = { timeout: 240000 };
let mongo, server, url, familia, administradora, analista, evaluador, ajeno, documentoWord;
const tokens = {};
const realFetch = globalThis.fetch;

before(async () => {
  process.env.JWT_SECRET = secreto;
  process.env.IA_HABILITADA = "true";
  delete process.env.GEMINI_API_KEY;
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri(), { dbName: "ea3_aislada" });
  const app = (await import("../src/app.js")).default;
  await Promise.all(Object.values(mongoose.models).map((modelo) => modelo.init()));
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${server.address().port}/api`;
  familia = await Familia.create({
    nombre: "Operaciones", plantillaInforme: "operaciones/plantilla_informe.xlsx",
    pautaEntrevista: "operaciones/pauta_entrevista.docx",
  });
  [administradora, analista, evaluador, ajeno] = await Promise.all(
    ["admin", "analista", "evaluador", "evaluador"].map((rol, indice) => Usuario.create({
      nombre: `Rol ficticio ${indice}`, correo: `rol-${indice}@example.invalid`, password, rol,
    })),
  );
  for (const [clave, usuario] of Object.entries({ admin: administradora, analista, evaluador, ajeno })) {
    tokens[clave] = jwt.sign({ id: usuario.id, rol: usuario.rol }, secreto, { expiresIn: "1h" });
  }
  documentoWord = await Packer.toBuffer(new Document({
    sections: [{ children: [new Paragraph("Antecedentes ficticios de entrevista académica.")] }],
  }));
}, mongoDisponible);

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo?.stop();
});

async function pedir(ruta, { metodo = "GET", rol, datos, estado = 200, ip } = {}) {
  const multipart = datos instanceof FormData;
  const respuesta = await realFetch(url + ruta, {
    method: metodo,
    headers: {
      ...(rol && { Authorization: `Bearer ${tokens[rol] ?? rol}` }),
      ...(datos && !multipart && { "Content-Type": "application/json" }),
      ...(ip && { "X-Forwarded-For": ip }),
    },
    body: datos && (multipart ? datos : JSON.stringify(datos)),
  });
  const cuerpo = Buffer.from(await respuesta.arrayBuffer());
  const resultado = respuesta.headers.get("content-type")?.includes("json") ? JSON.parse(cuerpo) : cuerpo;
  assert.equal(respuesta.status, estado, `${metodo} ${ruta}: ${cuerpo.toString().slice(0, 250)}`);
  return { resultado, headers: respuesta.headers };
}

function datosOferta(cargo) {
  return {
    cargo, familiaDeCargo: familia.id, modalidad: "híbrida", cupos: 2, ubicacion: "Puerto Montt",
    descripcion: "Vacante ficticia para la demostración", funciones: "Coordinar turnos",
    requisitos: "Experiencia en logística", beneficios: "Capacitación", sueldo: "$1.000.000 CLP",
  };
}

function formulario(datos, adjunto) {
  const form = new FormData();
  for (const [campo, valor] of Object.entries(datos)) form.set(campo, valor);
  if (adjunto) form.set(adjunto.campo, new Blob([adjunto.bytes], { type: adjunto.mime }), adjunto.nombre);
  return form;
}

function postular(ofertaId, adjunto = { campo: "cv", bytes: pdf, mime: "application/pdf", nombre: "CV_Ficticio.pdf" }, persona = {}) {
  return formulario({ nombre, correo, telefono, mensajeAdicional: "Disponibilidad ficticia", ...(ofertaId && { ofertaId }), ...persona }, adjunto);
}

async function solicitudesPublicadas() {
  const { resultado } = await pedir("/ofertas", {
    metodo: "POST", rol: "analista", datos: datosOferta("Operador de demostración"), estado: 201,
  });
  await pedir(`/ofertas/${resultado._id}/publicacion`, { metodo: "PATCH", rol: "analista", datos: { publicada: true } });
  return resultado._id;
}

test("Swagger sirve UI y contrato | login emite JWT verificable y las rutas exigen rol y sesión", async () => {
  const { resultado: html } = await pedir("/docs");
  assert.match(html.toString(), /SwaggerUIBundle/);
  const { resultado: doc } = await pedir("/docs/openapi.json");
  assert.ok(doc.components.securitySchemes.bearerAuth);
  const pauta = doc.paths["/solicitudes/{id}/pauta-entrevista"].get;
  assert.deepEqual(doc.security, [{ bearerAuth: [] }]);
  assert.equal(pauta.security, undefined);
  assert.ok(pauta.responses[200].content[tipoWord]);
  for (const estado of [401, 403, 404]) assert.ok(pauta.responses[estado]);
  assert.equal(doc.paths["/postulaciones"].post.security.length, 0);
  await pedir("/docs/assets/swagger-ui.css");
  await pedir("/health");
  await pedir("/no-existe", { estado: 404 });
  await pedir("/auth/login", { metodo: "POST", datos: {}, estado: 400 });
  await pedir("/auth/login", { metodo: "POST", datos: { correo: {}, password }, estado: 400 });
  await pedir("/auth/login", { metodo: "POST", datos: { correo: "desconocido@example.invalid", password }, estado: 401 });
  await pedir("/auth/login", { metodo: "POST", datos: { correo: administradora.correo, password: "incorrecta" }, estado: 401 });
  const { resultado: sesion } = await pedir("/auth/login", { metodo: "POST", datos: { correo: administradora.correo, password } });
  assert.equal(jwt.verify(sesion.token, secreto).id, administradora.id);
  const { resultado: perfil } = await pedir("/auth/perfil", { rol: sesion.token });
  assert.equal(perfil.rol, "admin");
  await pedir("/ofertas", { estado: 401 });
  await pedir("/ofertas", { rol: "token-inválido", estado: 401 });
  await pedir("/ofertas", { rol: jwt.sign({ id: analista.id, rol: "analista" }, secreto, { expiresIn: -1 }), estado: 401 });
  await pedir("/ofertas", { rol: jwt.sign({ id: analista.id, rol: "externo" }, secreto), estado: 401 });
  await pedir("/ofertas", { rol: "evaluador", estado: 403 });
  await pedir("/auth/registro", { metodo: "POST", rol: "evaluador", datos: {}, estado: 403 });
  await pedir("/auth/registro", { metodo: "POST", rol: "admin", datos: {}, estado: 400 });
  await pedir("/auth/registro", { metodo: "POST", rol: "admin", datos: { nombre, correo: evaluador.correo, password }, estado: 409 });
  await pedir("/auth/registro", { metodo: "POST", rol: "admin", datos: { nombre, correo: "nuevo@example.invalid", password }, estado: 201 });
  await pedir("/usuarios?rol=evaluador", { rol: "analista" });
  await pedir("/familias", { rol: "evaluador" });
  await pedir("/postulaciones/familias");
});

test("crear, validar, editar, buscar, publicar, despublicar y archivar ofertas", async () => {
  const datos = {
    ...datosOferta("Asistente [demo]"), area: "Industrial", region: "Los Lagos",
    objetivo: "Controlar indicadores", experiencia: "Un año", estudios: "Técnico",
    conocimientos: "Planificación de turnos",
  };
  await pedir("/ofertas", { metodo: "POST", rol: "analista", datos: { ...datos, sueldo: "" }, estado: 400 });
  await pedir("/ofertas", { metodo: "POST", rol: "analista", datos: { ...datos, area: ["Industrial"] }, estado: 400 });
  await pedir("/ofertas", { metodo: "POST", rol: "analista", datos: { ...datos, cupos: 1.5 }, estado: 400 });
  await pedir("/ofertas", { metodo: "POST", rol: "analista", datos: { ...datos, modalidad: "otra" }, estado: 400 });
  await pedir("/ofertas", { metodo: "POST", rol: "analista", datos: { ...datos, familiaDeCargo: new mongoose.Types.ObjectId() }, estado: 400 });
  const { resultado: borrador } = await pedir("/ofertas", { metodo: "POST", rol: "analista", datos, estado: 201 });
  const interna = `/ofertas/${borrador._id}`;
  const publica = `/ofertas/publicas/${borrador._id}`;
  assert.equal(borrador.estado, "borrador");
  await pedir(interna, { rol: "admin" });
  await pedir(publica, { estado: 404 });
  await pedir("/ofertas/publicas/id-inválido", { estado: 404 });
  await pedir(`${interna}/publicacion`, { metodo: "PATCH", rol: "admin", datos: { publicada: "sí" }, estado: 400 });
  const publicar = (publicada) => pedir(`${interna}/publicacion`, { metodo: "PATCH", rol: "admin", datos: { publicada } });
  const { resultado: publicada } = await publicar(true);
  assert.equal((await publicar(true)).resultado.fechaPublicacion, publicada.fechaPublicacion);
  assert.equal((await pedir(publica)).resultado.estado, "publicada");
  const { resultado: lista } = await pedir(`/ofertas/publicas?q=%5Bdemo%5D&familia=${familia.id}`);
  assert.deepEqual(lista.map((oferta) => oferta._id), [borrador._id]);
  const filtros = new URLSearchParams({ area: datos.area, region: datos.region, modalidad: datos.modalidad, q: "Planificación" });
  const { resultado: filtradas } = await pedir(`/ofertas/publicas?${filtros}`);
  assert.equal(filtradas.length, 1);
  assert.equal(filtradas[0].objetivo, datos.objetivo);
  assert.deepEqual((await pedir("/ofertas/publicas?region=Aysén")).resultado, []);
  await pedir("/ofertas/publicas?area=a&area=b", { estado: 400 });
  await pedir("/ofertas/publicas?modalidad=otra", { estado: 400 });
  assert.deepEqual((await pedir("/ofertas/publicas?q=otro")).resultado, []);
  await pedir("/ofertas/publicas?familia=inválida", { estado: 400 });
  await pedir("/ofertas/publicas?q=a&q=b", { estado: 400 });
  await pedir(interna, { metodo: "PUT", rol: "analista", datos: { ...datosOferta(datos.cargo), cupos: 3 } });
  const { resultado: editada } = await pedir(publica);
  assert.equal(editada.cupos, 3);
  assert.equal(editada.estudios, datos.estudios);
  await publicar(false);
  await pedir(publica, { estado: 404 });
  await pedir(interna, { metodo: "DELETE", rol: "analista", estado: 204 });
  assert.equal((await pedir(interna, { rol: "admin" })).resultado.estado, "archivada");
  await pedir(interna, { metodo: "PUT", rol: "analista", datos, estado: 404 });
  await pedir(`${interna}/publicacion`, { metodo: "PATCH", rol: "analista", datos: { publicada: true }, estado: 404 });
});

test("flujo integrado de dos ofertas reutiliza candidato y mantiene separados los CV privados", async () => {
  const ofertaId = await solicitudesPublicadas();
  const segunda = await solicitudesPublicadas();
  const ip = "192.0.2.23";
  const enviar = (datos, estado) => pedir("/postulaciones", { metodo: "POST", datos, estado, ip });
  await enviar(postular("id-inválido"), 404);
  await enviar(postular(new mongoose.Types.ObjectId().toString()), 404);
  await enviar(postular(ofertaId, null), 400);
  await enviar(postular(ofertaId, { campo: "cv", bytes: "% firma falsa", mime: "application/pdf", nombre: "mal.pdf" }), 400);
  await enviar(postular(ofertaId, { campo: "cv", bytes: Buffer.alloc(5 * 1024 * 1024 + 1), mime: "application/pdf", nombre: "grande.pdf" }), 400);
  const resultados = await Promise.all([ofertaId, segunda].map((id) =>
    enviar(postular(id), 201)));
  assert.ok(resultados.every(({ resultado }) => Object.keys(resultado).join() === "mensaje"));
  await enviar(postular(ofertaId), 409);

  const candidato = await Candidato.findOne({ correo }).select("+contenedorCv");
  assert.equal(await Candidato.countDocuments({ correo }), 1);
  const postulaciones = await Solicitud.find({ candidato: candidato.id });
  assert.equal(postulaciones.length, 2);
  const postulacion = postulaciones.find((solicitud) => solicitud.oferta.equals(ofertaId));
  const otra = postulaciones.find((solicitud) => solicitud.oferta.equals(segunda));
  const ruta = `/solicitudes/${postulacion.id}`;
  const descarga = `/archivos/${postulacion.cvPostulacion}`;
  const otraConexion = await mongoose.createConnection(mongo.getUri(), { dbName: "ea3_aislada" }).asPromise();
  let archivo;
  try {
    archivo = await otraConexion.model("Archivo", Archivo.schema).findById(postulacion.cvPostulacion).select("+datos");
    assert.equal(archivo.datos.toString(), pdf);
  } finally {
    await otraConexion.close();
  }
  assert.equal(String(archivo.solicitudId), postulacion.id);
  assert.match(archivo.clave, new RegExp(`^postulantes/camila-ficticia-${candidato.id}/cv/${postulacion.id}/.+CV_Ficticio\\.pdf$`));
  assert.equal(candidato.contenedorCv, archivo.clave.split("/").slice(0, 2).join("/"));
  assert.notEqual(String(postulacion.cvPostulacion), String(otra.cvPostulacion));
  assert.equal((await pedir(ruta, { rol: "analista" })).resultado.cvPostulacion.nombreOriginal, "CV_Ficticio.pdf");
  assert.ok((await pedir("/solicitudes", { rol: "analista" })).resultado.some(({ _id }) => _id === postulacion.id));
  assert.deepEqual((await pedir("/solicitudes", { rol: "evaluador" })).resultado, []);
  const rutaExpediente = `${ruta}/carpeta`;
  await pedir(rutaExpediente, { estado: 401 });
  await pedir(`/solicitudes/${new mongoose.Types.ObjectId()}/carpeta`, { rol: "admin", estado: 404 });
  const { resultado: expediente } = await pedir(rutaExpediente, { rol: "analista" });
  assert.equal(expediente.carpeta, candidato.contenedorCv);
  assert.equal(expediente.solicitudId, postulacion.id);
  assert.deepEqual(expediente.candidato, { _id: candidato.id, nombre });
  assert.equal(expediente.oferta._id, ofertaId);
  assert.equal(expediente.familia._id, familia.id);
  assert.equal(expediente.estado, "Pendiente");
  assert.deepEqual(expediente.documentos, {
    cv: { _id: String(postulacion.cvPostulacion), nombreOriginal: "CV_Ficticio.pdf" },
    informe: null, pauta: true,
  });
  assert.deepEqual((await pedir(rutaExpediente, { rol: "admin" })).resultado, expediente);
  const expedienteOtra = (await pedir(`/solicitudes/${otra.id}/carpeta`, { rol: "analista" })).resultado;
  assert.equal(expedienteOtra.carpeta, expediente.carpeta);
  assert.equal(expedienteOtra.documentos.cv._id, String(otra.cvPostulacion));
  await Solicitud.findByIdAndUpdate(otra.id, { cvPostulacion: postulacion.cvPostulacion });
  const expedienteInconsistente = (await pedir(`/solicitudes/${otra.id}/carpeta`, { rol: "analista" })).resultado;
  assert.equal(expedienteInconsistente.documentos.cv, null);
  assert.equal(expedienteInconsistente.carpeta, expediente.carpeta);
  await Solicitud.findByIdAndUpdate(otra.id, { cvPostulacion: otra.cvPostulacion });
  await pedir(descarga, { estado: 401 });
  await pedir(descarga, { rol: "evaluador", estado: 403 });
  const { resultado: bytes, headers } = await pedir(descarga, { rol: "analista" });
  assert.equal(bytes.toString(), pdf);
  assert.match(headers.get("content-disposition"), /^attachment/);
  assert.equal(headers.get("cache-control"), "private, no-store");
  await pedir(`${ruta}/estado`, { rol: "analista", metodo: "PATCH", datos: { estado: "En proceso" }, estado: 400 });
  const edicion = { candidatoNombre: nombre, candidatoCorreo: correo, candidatoTelefono: telefono, familiaDeCargo: familia.id,
    cargo: postulacion.cargo, profesionalResponsable: evaluador.id, observaciones: "Prueba ficticia", fechaEvaluacion: "2026-12-02T10:30:00-03:00" };
  await pedir(ruta, { rol: "analista", metodo: "PUT", datos: edicion });
  await pedir(`${ruta}/estado`, { rol: "analista", metodo: "PATCH", datos: { estado: "En proceso" } });
  const asignado = (await pedir(rutaExpediente, { rol: "evaluador" })).resultado;
  assert.equal(asignado.estado, "En proceso");
  assert.deepEqual(asignado.documentos, expediente.documentos);
  await pedir(descarga, { rol: "evaluador" });
  await pedir(descarga, { rol: "ajeno", estado: 403 });
  await pedir(`/archivos/${otra.cvPostulacion}`, { rol: "evaluador", estado: 403 });
  for (const sufijo of ["", "/carpeta", "/evaluaciones", "/informe", "/informe/evaluacion"]) {
    await pedir(ruta + sufijo, { rol: "ajeno", estado: 403 });
  }
  assert.equal((await pedir("/dashboard", { rol: "evaluador" })).resultado.solicitudesEnProceso, 1);
  await pedir("/dashboard", { rol: "admin" });
  const datos = { fechaEvaluacion: "2026-12-02", estado: "En proceso", resultado: "Observación ficticia" };
  await pedir(`${ruta}/evaluaciones`, { rol: "ajeno", metodo: "POST", datos, estado: 403 });
  await pedir(`${ruta}/evaluaciones`, { rol: "evaluador", metodo: "POST", datos: { ...datos, fechaEvaluacion: "2026-02-30" }, estado: 400 });
  const { resultado: evaluacion } = await pedir(`${ruta}/evaluaciones`, { rol: "evaluador", metodo: "POST", datos, estado: 201 });
  await pedir(`/evaluaciones/${evaluacion._id}`, { rol: "ajeno", metodo: "PUT", datos, estado: 403 });
  await pedir(`/evaluaciones/${evaluacion._id}`, { rol: "evaluador", metodo: "PUT", datos: { ...datos, estado: "Finalizada" } });
  assert.equal((await pedir(`${ruta}/evaluaciones`, { rol: "evaluador" })).resultado.length, 1);
  const reemplazo = formulario(edicion, { campo: "cv", bytes: documentoWord, mime: tipoWord, nombre: "CV_Nuevo.docx" });
  const { resultado: editada } = await pedir(ruta, { rol: "analista", metodo: "PUT", datos: reemplazo });
  await pedir(descarga, { rol: "analista", estado: 404 });
  await pedir(`/archivos/${editada.cvPostulacion._id}`, { rol: "evaluador" });
  const entrevista = formulario({}, { campo: "informe", bytes: documentoWord, mime: tipoWord, nombre: "Entrevista.docx" });
  await pedir(`${ruta}/informe-entrevista`, { rol: "ajeno", metodo: "PUT", datos: entrevista, estado: 403 });
  const { resultado: informe } = await pedir(`${ruta}/informe-entrevista`, { rol: "evaluador", metodo: "PUT", datos: entrevista });
  assert.deepEqual((await pedir(rutaExpediente, { rol: "evaluador" })).resultado.documentos, {
    cv: { _id: editada.cvPostulacion._id, nombreOriginal: "CV_Nuevo.docx" },
    informe: { _id: informe.informeArchivo._id, nombreOriginal: "Entrevista.docx" },
    pauta: true,
  });
  await pedir(`/archivos/${informe.informeArchivo._id}`, { rol: "evaluador" });
  assert.match((await extraerTextoDeArchivo(informe.informeArchivo._id, "la entrevista")).texto, /ficticios/);
  await comprobarIa(ruta);
  const { resultado: finalizada } = await pedir(`${ruta}/estado`, {
    rol: "admin", metodo: "PATCH", datos: { estado: "Finalizada", resultado: "Aprobada" },
  });
  assert.equal(finalizada.resultado, "Aprobada");
  await pedir(ruta, { rol: "admin", metodo: "DELETE" });
  await pedir(`/archivos/${editada.cvPostulacion._id}`, { rol: "admin", estado: 404 });
  await pedir(`/archivos/${otra.cvPostulacion}`, { rol: "admin" });
});

async function comprobarIa(ruta) {
  const preguntas = `${ruta}/preguntas-entrevista/generar`;
  await pedir(preguntas, { rol: "ajeno", metodo: "POST", estado: 403 });
  await pedir(preguntas, { rol: "analista", metodo: "POST", estado: 403 });
  await pedir(preguntas, { rol: "evaluador", metodo: "POST", estado: 503 });
  const peticiones = [];
  let respuestaIa;
  process.env.GEMINI_API_KEY = "clave-exclusiva-ficticia-de-prueba";
  globalThis.fetch = async (destino, opciones) => {
    assert.match(destino, /generativelanguage/);
    peticiones.push(JSON.parse(opciones.body));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuestaIa) }] } }] });
  };
  try {
    respuestaIa = { preguntas: [" ¿Cómo priorizarías los turnos? ", null, ""] };
    const { resultado } = await pedir(preguntas, { rol: "evaluador", metodo: "POST" });
    assert.deepEqual(resultado.preguntas, ["¿Cómo priorizarías los turnos?"]);
    assert.doesNotMatch(JSON.stringify(peticiones[0]), /camila|correo|CV_Nuevo/i);
    respuestaIa = { preguntas: [] };
    await pedir(preguntas, { rol: "evaluador", metodo: "POST", estado: 502 });
    const informe = `${ruta}/informe`;
    const nota = `${informe}/evaluacion`;
    assert.equal((await pedir(informe, { rol: "analista" })).resultado, null);
    await pedir(`${informe}/generar`, { rol: "evaluador", metodo: "POST", datos: {}, estado: 400 });
    respuestaIa = { secciones: [{ titulo: "Fortalezas", contenido: "Antecedentes ficticios" }] };
    const { resultado: borrador } = await pedir(`${informe}/generar`, {
      rol: "evaluador", metodo: "POST", datos: { apuntes: "Antecedentes simulados", instrucciones: "Breve" },
    });
    assert.equal((await pedir(informe, { rol: "analista" })).resultado, null);
    await pedir(informe, { rol: "evaluador", metodo: "PUT", datos: borrador });
    await pedir(nota, { rol: "evaluador", metodo: "PUT", datos: {}, estado: 400 });
    respuestaIa = {
      puntaje_global: 65, competencias: [], fortalezas: ["Observación"], areas_de_mejora: ["Práctica"],
      recomendaciones: ["Revisar"], resumen: "Evaluación ficticia",
    };
    const { resultado: apoyo } = await pedir(`${nota}/generar`, { rol: "evaluador", metodo: "POST", datos: {} });
    assert.equal((await pedir(nota, { rol: "evaluador" })).resultado, null);
    await pedir(nota, { rol: "evaluador", metodo: "PUT", datos: apoyo });
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.GEMINI_API_KEY;
  }
}

test("regresión EP2: postulación general, solicitud manual, carpeta local y archivos antiguos", async () => {
  const ip = "192.0.2.24";
  const persona = { nombre: "Persona Simulada", correo: "general@example.invalid", telefono,
    cargo: "Cargo de demostración", familiaDeCargo: familia.id };
  const enviar = (datos, estado) => pedir("/postulaciones", { metodo: "POST", datos, estado, ip });
  await enviar(formulario({ ...persona, sitioWeb: "bot" }), 201);
  await enviar(postular(null, undefined, { ...persona, nombre: "A" }), 400);
  await enviar(postular(null, undefined, { ...persona, correo: "incorrecto" }), 400);
  await enviar(postular(null, undefined, { ...persona, telefono: "incorrecto" }), 400);
  await enviar(postular(null, undefined, { ...persona, cargo: "" }), 400);
  await enviar(postular(null, undefined, { ...persona, familiaDeCargo: "incorrecta" }), 400);
  await enviar(postular(null, undefined, { ...persona, familiaDeCargo: new mongoose.Types.ObjectId().toString() }), 400);
  await enviar(postular(null, undefined, persona), 201);
  await enviar(postular(null, undefined, persona), 409);
  const candidato = await Candidato.findOne({ correo: persona.correo });
  const general = await Solicitud.findOne({ candidato: candidato.id });
  try {
    await pedir(`/solicitudes/${general.id}/carpeta`, { rol: "analista" });
    await pedir(`/archivos/${candidato.cvArchivoId}`, { rol: "analista" });
    await pedir(`/archivos/${candidato.cvArchivoId}`, { rol: "evaluador", estado: 403 });
  } finally {
    await pedir(`/solicitudes/${general.id}`, { rol: "admin", metodo: "DELETE" });
  }

  const manual = { candidatoNombre: persona.nombre, candidatoCorreo: "manual@example.invalid",
    candidatoTelefono: telefono, familiaDeCargo: familia.id, cargo: persona.cargo, profesionalResponsable: evaluador.id };
  const subir = { campo: "cv", bytes: documentoWord, mime: tipoWord, nombre: "CV.docx" };
  const crear = (datos, estado) => pedir("/solicitudes", { rol: "analista", metodo: "POST", datos, estado });
  await crear(formulario({}), 400);
  await crear(formulario({ ...manual, profesionalResponsable: analista.id }, subir), 400);
  await crear(formulario({ ...manual, candidatoTelefono: "incorrecto" }, subir), 400);
  const { resultado: existente } = await crear(formulario(manual, subir), 201);
  const ruta = `/solicitudes/${existente._id}`;
  try {
    await pedir(`/archivos/${existente.candidato.cvArchivoId._id}`, { rol: "evaluador" });
    await pedir(`/archivos/${existente.candidato.cvArchivoId._id}`, { rol: "ajeno", estado: 403 });
    await pedir(ruta, { rol: "analista", metodo: "PUT", datos: formulario(manual, subir) });
    await pedir(`${ruta}/informe-entrevista`, { rol: "evaluador", metodo: "PUT", datos: formulario({}), estado: 400 });
    await pedir(`${ruta}/informe-entrevista`, { rol: "evaluador", metodo: "PUT",
      datos: formulario({}, { ...subir, campo: "informe", nombre: "Informe.docx" }) });
    await pedir(`${ruta}/carpeta`, { rol: "evaluador" });
  } finally {
    await pedir(ruta, { rol: "admin", metodo: "DELETE" });
  }
});

test("un fallo al persistir el CV revierte el alta y permite reintentar", async (contexto) => {
  const ofertaId = await solicitudesPublicadas();
  const postulante = { nombre: "Persona Prueba", correo: "reintento@example.invalid" };
  const opciones = { metodo: "POST", ip: "192.0.2.25" };
  const solicitudesAntes = await Solicitud.countDocuments({ oferta: ofertaId });
  const archivosAntes = await Archivo.countDocuments();
  const fallo = contexto.mock.method(Archivo.prototype, "save", async () => { throw new Error("Falla ficticia"); });
  await pedir("/postulaciones", { ...opciones, datos: postular(ofertaId, undefined, postulante), estado: 503 });
  assert.equal(await Candidato.exists({ correo: postulante.correo }), null);
  assert.equal(await Solicitud.countDocuments({ oferta: ofertaId }), solicitudesAntes);
  assert.equal(await Archivo.countDocuments(), archivosAntes);
  fallo.mock.restore();
  await pedir("/postulaciones", { ...opciones, datos: postular(ofertaId, undefined, postulante), estado: 201 });
  assert.equal(await Solicitud.countDocuments({ oferta: ofertaId }), solicitudesAntes + 1);
});

test("descarga las pautas maestras por familia con JWT y asignación", async () => {
  const candidato = await Candidato.create({ nombre, correo: "pauta@example.invalid", telefono });
  const crear = (familiaDeCargo) => Solicitud.create({
    candidato: candidato.id, familiaDeCargo, cargo: "Cargo ficticio", profesionalResponsable: evaluador.id,
  });
  for (const [nombre, carpeta, sufijo] of [
    ["Operaciones", "operaciones", "Operaciones"],
    ["Administración", "administracion", "Administracion"],
    ["Atención al Cliente", "atencion-cliente", "Atencion_Al_Cliente"],
    ["Ventas", "ventas", "Ventas"],
  ]) {
    const pautaEntrevista = `${carpeta}/pauta_entrevista.docx`;
    const familiaActual = carpeta === "operaciones" ? familia : await Familia.create({ nombre, pautaEntrevista });
    const solicitud = await crear(familiaActual.id);
    const ruta = `/solicitudes/${solicitud.id}/pauta-entrevista`;
    const esperado = await readFile(new URL(`../plantillas/${pautaEntrevista}`, import.meta.url));
    const roles = carpeta === "operaciones" ? ["analista", "admin", "evaluador"] : ["evaluador"];
    for (const rol of roles) {
      const { resultado, headers } = await pedir(ruta, { rol });
      assert.deepEqual(resultado, esperado);
      assert.equal(headers.get("content-type"), tipoWord);
      assert.equal(headers.get("content-disposition"), `attachment; filename="Pauta_Entrevista_${sufijo}.docx"`);
      assert.equal(headers.get("cache-control"), "private, no-store");
    }
    if (carpeta === "operaciones") {
      await pedir(ruta, { estado: 401 });
      await pedir(ruta, { rol: "ajeno", estado: 403 });
      const consulta = new URLSearchParams({ ruta: "../../package.json", pautaEntrevista: "ventas/pauta_entrevista.docx" });
      assert.deepEqual((await pedir(`${ruta}?${consulta}`, { rol: "evaluador" })).resultado, esperado);
    }
  }
  const sinPauta = await Familia.create({ nombre: "Familia ficticia sin pauta" });
  const solicitudSinPauta = await crear(sinPauta.id);
  const expedienteSinPauta = (await pedir(`/solicitudes/${solicitudSinPauta.id}/carpeta`, { rol: "admin" })).resultado;
  assert.equal(expedienteSinPauta.carpeta, null);
  assert.deepEqual(expedienteSinPauta.documentos, { cv: null, informe: null, pauta: false });
  const ruta = `/solicitudes/${solicitudSinPauta.id}/pauta-entrevista`;
  const { resultado: error } = await pedir(ruta, { rol: "admin", estado: 404 });
  assert.match(error.mensaje, /no tiene una pauta/);
  for (const pautaEntrevista of [
    "../package.json", "operaciones/../ventas/pauta_entrevista.docx",
    String.raw`operaciones\..\ventas\pauta_entrevista.docx`, "operaciones/plantilla_informe.xlsx",
    "C:/privado/pauta_entrevista.docx",
  ]) {
    await Familia.findByIdAndUpdate(sinPauta.id, { pautaEntrevista });
    assert.deepEqual((await pedir(ruta, { rol: "admin", estado: 404 })).resultado, error);
  }
  await pedir("/solicitudes/no-existe/pauta-entrevista", { rol: "admin", estado: 404 });
  await pedir(`/solicitudes/${new mongoose.Types.ObjectId()}/pauta-entrevista`, { rol: "admin", estado: 404 });
});

test("reemplaza únicamente el CV de la solicitud y valida PDF, permisos y archivos previos", async () => {
  const oferta = await solicitudesPublicadas();
  await pedir("/postulaciones", {
    metodo: "POST", estado: 201, ip: "192.0.2.26",
    datos: postular(oferta, undefined, { nombre: "Benjamin Ficticio", correo: "benjamin@example.invalid" }),
  });
  const original = await Solicitud.findOne({ oferta });
  await Solicitud.findByIdAndUpdate(original.id, { profesionalResponsable: evaluador.id, estado: "Finalizada", resultado: "Aprobada" });
  const ruta = `/solicitudes/${original.id}`;
  const antes = (await pedir(ruta + "/carpeta", { rol: "analista" })).resultado;
  const cuentaSolicitudes = await Solicitud.countDocuments();
  const cuentaCandidatos = await Candidato.countDocuments();
  const archivo = (bytes = pdfReal, nombre = "CV_Benjamin_Ficticio.pdf", mime = "application/pdf") =>
    formulario({}, { campo: "cv", bytes, nombre, mime });
  const reemplazar = (rol, datos, estado = 200) => pedir(ruta + "/cv", { rol, metodo: "PUT", datos, estado });
  await reemplazar(undefined, archivo(), 401);
  await reemplazar("evaluador", archivo(), 403);
  await reemplazar("ajeno", archivo(), 403);
  await reemplazar("analista", formulario({}), 400);
  await reemplazar("analista", archivo(documentoWord, "CV.docx", tipoWord), 400);
  await reemplazar("analista", archivo(pdfReal, "CV.pdf", "application/octet-stream"), 400);
  await reemplazar("analista", archivo("firma incorrecta"), 400);
  await reemplazar("analista", archivo("%PDF-1.4\nDocumento trucado"), 400);
  await reemplazar("analista", archivo(Buffer.alloc(5 * 1024 * 1024 + 1)), 400);
  assert.equal(String((await Solicitud.findById(original.id)).cvPostulacion), String(original.cvPostulacion));
  const { resultado: analistaCv } = await reemplazar("analista", archivo());
  assert.equal(analistaCv.cvArchivo.nombreOriginal, "CV_Benjamin_Ficticio.pdf");
  const { resultado: adminCv } = await reemplazar("admin", archivo(pdfReal, "CV_corregido.pdf"));
  const id = adminCv.cvArchivo._id;
  await pedir(`/archivos/${original.cvPostulacion}`, { rol: "admin", estado: 404 });
  await pedir(`/archivos/${analistaCv.cvArchivo._id}`, { rol: "admin", estado: 404 });
  assert.deepEqual((await pedir(`/archivos/${id}`, { rol: "evaluador" })).resultado, pdfReal);
  const despues = (await pedir(ruta + "/carpeta", { rol: "analista" })).resultado;
  assert.equal(despues.carpeta, antes.carpeta);
  assert.deepEqual(despues.candidato, antes.candidato);
  assert.deepEqual(despues.oferta, antes.oferta);
  assert.equal(despues.solicitudId, antes.solicitudId);
  assert.equal(despues.estado, "Finalizada");
  assert.equal((await Solicitud.findById(original.id)).resultado, "Aprobada");
  assert.equal(despues.documentos.cv._id, id);
  assert.equal(await Solicitud.countDocuments(), cuentaSolicitudes);
  assert.equal(await Candidato.countDocuments(), cuentaCandidatos);

  const candidato = await Candidato.findById(original.candidato);
  const compartido = await Archivo.create({
    tipo: "cv", candidatoId: candidato.id, datos: pdfReal, nombreOriginal: "CV_Anterior.pdf",
    mimeType: "application/pdf", tamano: pdfReal.length,
  });
  candidato.cvArchivoId = compartido._id;
  await candidato.save();
  const anterior = await Solicitud.create({ candidato: candidato.id, familiaDeCargo: familia.id, cargo: "Cargo anterior" });
  const otra = await Solicitud.create({ candidato: candidato.id, familiaDeCargo: familia.id, cargo: "Otra solicitud" });
  await pedir(`/solicitudes/${anterior.id}/cv`, { rol: "analista", metodo: "PUT", datos: archivo() });
  const carpeta = async (solicitud) => (await pedir(`/solicitudes/${solicitud.id}/carpeta`, { rol: "analista" })).resultado;
  assert.notEqual((await carpeta(anterior)).documentos.cv._id, compartido.id);
  assert.equal((await carpeta(otra)).documentos.cv._id, compartido.id);
});
