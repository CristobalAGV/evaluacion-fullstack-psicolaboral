import { CAMPOS_OFERTA, CAMPOS_PROFESIONALES, MODALIDADES } from "./models/Oferta.js";

const texto = { type: "string" };
const id = { ...texto, pattern: "^[a-fA-F0-9]{24}$" };
const fecha = { ...texto, format: "date-time" };
const archivo = { ...texto, format: "binary" };
const estados = { ...texto, enum: ["Pendiente", "En proceso", "Finalizada"] };
const objeto = (properties, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const lista = (items) => ({ type: "array", items });
const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const contenido = (schema, media = "application/json") => ({ [media]: { schema } });
const consulta = (name, schema = texto) => ({ name, in: "query", schema });
const idRuta = [{ name: "id", in: "path", required: true, schema: id }];
const credenciales = objeto({ correo: { ...texto, format: "email" }, password: texto }, ["correo", "password"]);
const datosOferta = {
  ...Object.fromEntries(Object.entries(CAMPOS_OFERTA).map(([campo, maxLength]) => [
    campo, { ...texto, minLength: 1, maxLength },
  ])),
  familiaDeCargo: id, modalidad: { ...texto, enum: MODALIDADES }, cupos: { type: "integer", minimum: 1, maximum: 10000 },
};
const ofertaProfesional = Object.fromEntries(Object.entries(CAMPOS_PROFESIONALES).map(([campo, maxLength]) => [
  campo, { ...texto, maxLength },
]));
const filtrosOferta = [
  consulta("q", { ...texto, maxLength: 100 }), consulta("familia", id),
  consulta("area", ofertaProfesional.area), consulta("region", ofertaProfesional.region),
  consulta("modalidad", datosOferta.modalidad),
];
const familia = objeto({ _id: id, nombre: texto });
const adjuntoExpediente = { ...objeto({ _id: id, nombreOriginal: texto }), nullable: true };
const estadosPublicacion = { ...texto, enum: ["borrador", "publicada", "archivada"] };
const postulacion = objeto({
  nombre: texto, correo: texto, telefono: texto, ofertaId: id, cargo: texto, familiaDeCargo: id,
  mensajeAdicional: { ...texto, maxLength: 800 }, cv: { ...archivo, description: "PDF, DOC o DOCX, hasta 5 MB." },
}, ["nombre", "correo", "telefono", "cv"]);
const datosSolicitud = objeto({
  candidatoNombre: texto, candidatoCorreo: texto, candidatoTelefono: texto, familiaDeCargo: id, cargo: texto,
  profesionalResponsable: id, fechaEvaluacion: { ...fecha, nullable: true }, observaciones: texto, cv: archivo,
}, ["candidatoNombre", "candidatoCorreo", "candidatoTelefono", "familiaDeCargo", "cargo", "profesionalResponsable"]);
const datosEvaluacion = objeto({ fechaEvaluacion: { ...texto, format: "date" }, resultado: texto, estado: estados });
const seccion = objeto({ titulo: texto, contenido: texto }, ["titulo"]);
const datosInforme = objeto({ secciones: lista(seccion), apuntes: texto, instrucciones: texto, estado: texto, modeloIa: texto }, ["secciones"]);
const nota = { type: "number", minimum: 0, maximum: 100 };
const apoyo = objeto({
  puntajeGlobal: nota, competencias: lista(objeto({ nombre: texto, puntaje: { ...nota, nullable: true }, justificacion: texto })),
  fortalezas: lista(texto), areasDeMejora: lista(texto), recomendaciones: lista(texto), resumen: texto, modeloIa: texto,
}, ["puntajeGlobal"]);

const mensajes = {
  400: "Datos inválidos", 401: "Token ausente o inválido, o credenciales incorrectas",
  403: "Rol insuficiente o evaluador sin asignación", 404: "Recurso no disponible", 409: "Conflicto con el estado de la solicitud o con un registro existente",
  429: "Límite de intentos o cuota alcanzada", 500: "Error interno", 502: "Error del proveedor de IA",
  503: "Servicio temporalmente no disponible", 504: "Tiempo de espera del proveedor agotado",
};

function operacion(tag, summary, {
  publica = false, status = 200, salida = objeto({}, []), body, media, parametros,
  errores = [], binario = false, tipoBinario = "application/octet-stream",
} = {}) {
  const respuestas = [...(publica ? [] : [401, 403]), ...errores, 500];
  return {
    tags: [tag], summary,
    ...(publica && { security: [] }),
    ...(parametros && { parameters: parametros }),
    ...(body && { requestBody: { required: true, content: contenido(body, media) } }),
    responses: {
      [status]: { description: "Operación exitosa", ...(status !== 204 && {
        content: contenido(binario ? archivo : salida, binario ? tipoBinario : undefined),
        ...(binario && { headers: { "Content-Disposition": { schema: texto } } }),
      }) },
      ...Object.fromEntries(respuestas.map((codigo) => [
        codigo, { description: mensajes[codigo], content: contenido(ref("Mensaje")) },
      ])),
    },
  };
}

const multipart = "multipart/form-data";
const porId = { parametros: idRuta, errores: [404] };
const ia = { ...porId, errores: [400, 404, 409, 429, 502, 503, 504] };
const rutaInforme = "/solicitudes/{id}/informe";
const rutaNota = `${rutaInforme}/evaluacion`;
const lecturaOferta = { salida: ref("Oferta"), ...porId };
const editarOferta = { body: ref("DatosOferta"), salida: ref("Oferta"), errores: [400] };

export default {
  openapi: "3.0.3",
  info: { title: "AquaChile · Evaluación psicolaboral", version: "3.0.0" },
  servers: [{ url: "/api" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Mensaje: objeto({ mensaje: texto }, ["mensaje"]),
      Usuario: objeto({ id, _id: id, nombre: texto, correo: texto, rol: { ...texto, enum: ["analista", "evaluador", "admin"] } }),
      DatosOferta: objeto({ ...datosOferta, ...ofertaProfesional }, Object.keys(datosOferta)),
      Oferta: objeto({ ...datosOferta, ...ofertaProfesional, _id: id, familiaDeCargo: familia, estado: estadosPublicacion, fechaPublicacion: { ...fecha, nullable: true } }),
      Candidato: objeto({ _id: id, nombre: texto, correo: texto, telefono: texto, origen: texto }),
      Archivo: objeto({ _id: id, nombreOriginal: texto, mimeType: texto, tamano: { type: "integer" } }),
      Solicitud: objeto({ _id: id, cargo: texto, oferta: id, candidato: ref("Candidato"), familiaDeCargo: familia,
        cvPostulacion: ref("Archivo"), informePostulacion: ref("Archivo"), profesionalResponsable: ref("Usuario"),
        estado: estados, fechaEvaluacion: { ...fecha, nullable: true }, observaciones: texto, mensajeAdicional: texto,
        resultado: { ...texto, enum: ["Aprobada", "Rechazada"], nullable: true } }),
      Evaluacion: objeto({ ...datosEvaluacion.properties, _id: id, solicitud: id }),
    },
  },
  paths: {
    "/auth/login": { post: operacion("Autenticación", "Iniciar sesión", { publica: true, body: credenciales, errores: [400, 401],
      salida: objeto({ token: texto, usuario: ref("Usuario") }) }) },
    "/auth/perfil": { get: operacion("Autenticación", "Consultar perfil", { salida: ref("Usuario"), errores: [404] }) },
    "/auth/registro": { post: operacion("Usuarios", "Crear usuario interno (admin)", { status: 201,
      body: objeto({ ...credenciales.properties, nombre: texto, rol: { ...texto, enum: ["analista", "evaluador"] } }, ["nombre", "correo", "password"]),
      salida: objeto({ mensaje: texto, usuario: ref("Usuario") }), errores: [400, 409] }) },
    "/usuarios": { get: operacion("Usuarios", "Listar usuarios (admin/analista)", { parametros: [consulta("rol")], salida: lista(ref("Usuario")) }) },
    "/familias": { get: operacion("Ofertas", "Listar familias internas", { salida: lista(familia) }) },
    "/dashboard": { get: operacion("Solicitudes", "Consultar indicadores del flujo según el rol", {
      salida: objeto(Object.fromEntries(["totalCandidatos", "solicitudesPendientes", "solicitudesEnProceso", "solicitudesFinalizadas"]
        .map((campo) => [campo, { type: "integer", minimum: 0 }]))),
    }) },
    "/ofertas": {
      get: operacion("Ofertas", "Listar ofertas internas (admin/analista)", { parametros: filtrosOferta, salida: lista(ref("Oferta")), errores: [400] }),
      post: operacion("Ofertas", "Crear borrador (admin/analista)", { ...editarOferta, status: 201 }),
    },
    "/ofertas/{id}": {
      get: operacion("Ofertas", "Ver oferta interna (admin/analista)", lecturaOferta),
      put: operacion("Ofertas", "Editar oferta activa (admin/analista)", { ...editarOferta, ...porId, errores: [400, 404] }),
      delete: operacion("Ofertas", "Archivar y conservar el historial (admin/analista)", { ...porId, status: 204 }),
    },
    "/ofertas/{id}/publicacion": { patch: operacion("Ofertas", "Publicar o despublicar (admin/analista)", {
      ...lecturaOferta, body: objeto({ publicada: { type: "boolean" } }, ["publicada"]), errores: [400, 404],
    }) },
    "/ofertas/publicas": { get: operacion("Ofertas", "Buscar ofertas publicadas", { publica: true, parametros: filtrosOferta, salida: lista(ref("Oferta")), errores: [400] }) },
    "/ofertas/publicas/{id}": { get: operacion("Ofertas", "Ver una oferta publicada", { ...lecturaOferta, publica: true }) },
    "/postulaciones/familias": { get: operacion("Postulaciones", "Listar familias públicas", { publica: true, salida: lista(familia), errores: [429] }) },
    "/postulaciones": { post: operacion("Postulaciones", "Postular con ofertaId, o con cargo y familiaDeCargo para el formulario general", {
      publica: true, status: 201, body: postulacion, media: multipart, salida: ref("Mensaje"), errores: [400, 404, 409, 429, 503],
    }) },
    "/solicitudes": {
      get: operacion("Solicitudes", "Listar solicitudes con candidatos. Evaluador: solo asignadas", { salida: lista(ref("Solicitud")) }),
      post: operacion("Solicitudes", "Crear solicitud y candidato (admin/analista)", {
        status: 201, media: multipart, body: datosSolicitud, salida: ref("Solicitud"), errores: [400, 404],
      }),
    },
    "/solicitudes/{id}": {
      get: operacion("Solicitudes", "Consultar solicitud, candidato y metadatos del CV", { ...porId, salida: ref("Solicitud") }),
      put: operacion("Solicitudes", "Editar o asignar responsable (admin/analista)", {
        ...porId, media: multipart, body: datosSolicitud, salida: ref("Solicitud"), errores: [400, 404],
      }),
      delete: operacion("Solicitudes", "Eliminar solicitud (admin)", { ...porId, salida: ref("Mensaje") }),
    },
    "/solicitudes/{id}/estado": { patch: operacion("Solicitudes", "Cambiar estado y resultado (admin/analista)", {
      ...porId, body: objeto({ estado: estados, resultado: { ...texto, enum: ["Aprobada", "Rechazada"], nullable: true } }, ["estado"]),
      salida: ref("Solicitud"), errores: [400, 404],
    }) },
    "/solicitudes/{id}/carpeta": { get: operacion("Archivos", "Consultar el expediente privado de la solicitud", {
      ...porId, salida: objeto({
        carpeta: { ...texto, nullable: true }, archivos: lista(objeto({ nombre: texto, tipo: texto })),
        solicitudId: id, candidato: { ...objeto({ _id: id, nombre: texto }), nullable: true },
        oferta: { ...objeto({ _id: id, cargo: texto }), nullable: true }, familia: { ...familia, nullable: true },
        estado: estados, documentos: objeto({ cv: adjuntoExpediente, informe: adjuntoExpediente, pauta: { type: "boolean" } }),
      }),
    }) },
    "/solicitudes/{id}/cv": { put: operacion("Archivos", "Reemplazar el CV de la solicitud (admin/analista)", {
      ...porId, media: multipart, body: objeto({ cv: { ...archivo, description: "PDF válido de hasta 5 MB" } }, ["cv"]),
      salida: objeto({ cvArchivo: ref("Archivo") }), errores: [400, 404],
    }) },
    "/solicitudes/{id}/informe-entrevista": { put: operacion("Archivos", "Adjuntar informe Word", {
      ...porId, media: multipart, body: objeto({ informe: archivo }, ["informe"]), salida: objeto({ informeArchivo: ref("Archivo") }), errores: [400, 404],
    }) },
    "/solicitudes/{id}/pauta-entrevista": { get: operacion("Archivos", "Descargar la pauta Word de la familia. Evaluador: solo asignadas", {
      ...porId, binario: true, tipoBinario: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }) },
    "/archivos/{id}": { get: operacion("Archivos", "Descargar archivo privado. Evaluador: solo asignadas", { ...porId, binario: true }) },
    "/solicitudes/{id}/evaluaciones": {
      get: operacion("Evaluaciones", "Listar evaluaciones de una solicitud", { ...porId, salida: lista(ref("Evaluacion")) }),
      post: operacion("Evaluaciones", "Registrar evaluación (responsable/admin)", {
        ...porId, status: 201, body: datosEvaluacion, salida: ref("Evaluacion"), errores: [400, 404, 409],
      }),
    },
    "/evaluaciones/{id}": { put: operacion("Evaluaciones", "Actualizar evaluación (responsable/admin)", {
      ...porId, body: datosEvaluacion, salida: ref("Evaluacion"), errores: [400, 404, 409],
    }) },
    [rutaInforme]: {
      get: operacion("IA", "Leer informe psicolaboral", { ...porId, salida: { ...datosInforme, nullable: true } }),
      put: operacion("IA", "Guardar informe revisado (responsable/admin)", { ...porId, body: datosInforme, salida: datosInforme, errores: [400, 404, 409] }),
    },
    [`${rutaInforme}/generar`]: { post: operacion("IA", "Generar borrador desde apuntes ficticios (responsable/admin)", {
      ...ia, body: objeto({ apuntes: texto, instrucciones: texto }, ["apuntes"]), salida: datosInforme,
    }) },
    [rutaNota]: {
      get: operacion("IA", "Leer evaluación de apoyo", { ...porId, salida: { ...apoyo, nullable: true } }),
      put: operacion("IA", "Guardar evaluación de apoyo revisada (responsable/admin)", { ...porId, body: apoyo, salida: apoyo, errores: [400, 404, 409] }),
    },
    [`${rutaNota}/generar`]: { post: operacion("IA", "Generar evaluación de apoyo con archivos ficticios (responsable/admin)", {
      ...ia, body: objeto({ apuntes: texto }), salida: apoyo,
    }) },
    "/solicitudes/{id}/preguntas-entrevista/generar": { post: operacion("IA", "Sugerir preguntas para un cargo ficticio (responsable/admin)", {
      ...ia, salida: objeto({ preguntas: lista(texto), modelo: texto }),
    }) },
  },
};
