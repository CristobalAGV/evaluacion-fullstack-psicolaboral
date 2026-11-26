import { CAMPOS_OFERTA, CAMPOS_PROFESIONALES, MODALIDADES } from "./models/Oferta.js";

const texto = { type: "string" };
const id = { ...texto, pattern: "^[a-fA-F0-9]{24}$" };
const fecha = { ...texto, format: "date-time" };
const archivo = { ...texto, format: "binary" };
const estados = { ...texto, enum: ["Pendiente", "En proceso", "Finalizada"] };
const objeto = (properties, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const lista = (items) => ({ type: "array", items });
const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const referenciaPoblada = (nombre) => ({ oneOf: [{ ...id, nullable: true }, ref(nombre)] });
const consulta = (name, schema = texto) => ({ name, in: "query", schema });
const idRuta = [{ name: "id", in: "path", required: true, schema: id }];
const credenciales = objeto({ correo: { ...texto, format: "email" }, password: texto }, ["correo", "password"]);
const idEjemplo = "000000000000000000000001";
const inicioEjemplo = { correo: "evaluador@example.invalid", password: "contrasena-ficticia" };
const usuarioEjemplo = { id: idEjemplo, nombre: "Cuenta ficticia", correo: inicioEjemplo.correo, rol: "evaluador" };
const datosOferta = {
  ...Object.fromEntries(Object.entries(CAMPOS_OFERTA).map(([campo, maxLength]) => [
    campo, { ...texto, minLength: 1, maxLength },
  ])),
  familiaDeCargo: id, modalidad: { ...texto, enum: MODALIDADES }, cupos: { type: "integer", minimum: 1, maximum: 10000 },
};
const ofertaProfesional = Object.fromEntries(Object.entries(CAMPOS_PROFESIONALES).map(([campo, maxLength]) => [
  campo, { ...texto, maxLength },
]));
const siNo = { type: "boolean" };
const nivelEstudios = { ...texto, enum: ["media", "tecnico", "profesional", "postgrado"] };
const experienciaAnios = { type: "number", minimum: 0, maximum: 70 };
const camposAntecedentes = {
  nivelEstudios, experienciaAnios, conocimientos: lista(texto), certificaciones: lista(texto),
  licencia: siNo, disponibilidad: siNo, modalidades: lista(datosOferta.modalidad),
};
const antecedentesPreseleccion = objeto({ ...camposAntecedentes, carrera: texto, industrias: lista(texto) });
const requisitosOferta = {
  requisitosEstructurados: objeto({ ...camposAntecedentes, carreras: lista(texto) }),
  requisitosDeseables: objeto({ conocimientos: lista(texto), industrias: lista(texto) }),
};
const motivoPreseleccion = { ...texto, minLength: 1, maxLength: 500 };
const registroPreseleccion = { motivo: motivoPreseleccion, usuario: id, fecha };
const preseleccion = { ...objeto({
  estadoPreseleccion: { ...texto, enum: ["cumple", "revision", "no_cumple"] },
  porcentajeCoincidencia: { type: "integer", minimum: 0, maximum: 100 },
  requisitosCumplidos: lista(texto), requisitosNoCumplidos: lista(texto), requisitosSinInformacion: lista(texto),
  criterios: lista(objeto({ grupo: { ...texto, enum: ["excluyente", "deseable"] }, requisito: texto,
    resultado: { ...texto, enum: ["cumplido", "no_cumplido", "sin_informacion"] } })),
  requisitosAplicados: objeto({ excluyentes: requisitosOferta.requisitosEstructurados, deseables: requisitosOferta.requisitosDeseables }),
  fechaEvaluacionPrevia: fecha, version: { type: "integer" },
  recalculo: objeto(registroPreseleccion), continuidad: objeto(registroPreseleccion),
}), nullable: true };
const filtrosOferta = [
  consulta("q", { ...texto, maxLength: 100 }), consulta("familia", id),
  consulta("area", ofertaProfesional.area), consulta("region", ofertaProfesional.region),
  consulta("modalidad", datosOferta.modalidad),
];
const familia = { ...objeto({ _id: id, nombre: texto }), example: { _id: idEjemplo, nombre: "Operaciones" } };
const adjuntoExpediente = { ...objeto({ _id: id, nombreOriginal: texto }), nullable: true };
const estadosPublicacion = { ...texto, enum: ["borrador", "publicada", "archivada"] };
const ofertaEjemplo = {
  cargo: "Analista ficticio de operaciones", familiaDeCargo: idEjemplo, ubicacion: "Puerto Montt",
  modalidad: "presencial", cupos: 1, descripcion: "Vacante académica", funciones: "Revisar inventario",
  requisitos: "Excel básico", beneficios: "Capacitación", sueldo: "$1.000.000 CLP",
};
const ofertaPublicadaEjemplo = {
  ...ofertaEjemplo, _id: idEjemplo, familiaDeCargo: familia.example, estado: "publicada", fechaPublicacion: "2026-11-25T12:00:00.000Z",
};
const candidatoEjemplo = { _id: idEjemplo, nombre: "Persona ficticia", correo: "postulante@example.invalid", telefono: "+56 9 0000 0000" };
const archivoEjemplo = { _id: idEjemplo, nombreOriginal: "CV_Ficticio.pdf", mimeType: "application/pdf", tamano: 800, tipo: "cv" };
const resultadoHumano = { ...texto, enum: ["Aprobada", "Rechazada", null], nullable: true };
const postulacion = objeto({
  nombre: texto, correo: texto, telefono: texto, ofertaId: id, cargo: texto, familiaDeCargo: id,
  antecedentes: { ...texto, description: "Objeto JSON serializado de AntecedentesPreseleccion. Opcional para postulaciones con ofertaId." },
  mensajeAdicional: { ...texto, maxLength: 800 }, cv: { ...archivo, description: "PDF, DOC o DOCX, hasta 5 MB." },
}, ["nombre", "correo", "telefono", "cv"]);
const datosSolicitud = objeto({
  candidatoNombre: texto, candidatoCorreo: texto, candidatoTelefono: texto, familiaDeCargo: id, cargo: texto,
  profesionalResponsable: id, fechaEvaluacion: { ...fecha, nullable: true }, observaciones: texto, cv: archivo,
}, ["candidatoNombre", "candidatoCorreo", "candidatoTelefono", "familiaDeCargo", "cargo", "profesionalResponsable"]);
const datosEvaluacion = objeto({ fechaEvaluacion: { ...texto, format: "date" }, resultado: texto, estado: estados });
const seccion = objeto({ titulo: texto, contenido: texto }, ["titulo"]);
const datosInforme = objeto({ secciones: { ...lista(seccion), minItems: 1 }, apuntes: texto, instrucciones: texto,
  estado: { ...texto, enum: ["borrador", "finalizado"] }, modeloIa: texto }, ["secciones"]);
const informeGuardado = objeto({ ...datosInforme.properties, _id: id, solicitud: id, candidato: id,
  generadoPor: ref("Usuario"), generadoEn: fecha, createdAt: fecha, updatedAt: fecha });
const informeEjemplo = { secciones: [{ titulo: "Fortalezas", contenido: "Ejemplo ficticio revisado." }], apuntes: "Apuntes ficticios" };
const nota = { type: "number", minimum: 0, maximum: 100 };
const apoyo = objeto({
  puntajeGlobal: nota, competencias: lista(objeto({ nombre: texto, puntaje: { ...nota, nullable: true }, justificacion: texto })),
  fortalezas: lista(texto), areasDeMejora: lista(texto), recomendaciones: lista(texto), resumen: texto, modeloIa: texto,
}, ["puntajeGlobal"]);

const mensajes = {
  400: "Datos inválidos", 401: "Token ausente o inválido, o credenciales incorrectas",
  403: "Rol insuficiente o evaluador sin asignación", 404: "Recurso no disponible", 409: "Conflicto con el estado de la solicitud o con un registro existente",
  413: "Solicitud JSON demasiado grande", 429: "Límite de intentos o cuota alcanzada", 500: "Error interno", 502: "Error del proveedor de IA",
  503: "Servicio temporalmente no disponible", 504: "Tiempo de espera del proveedor agotado",
};

function operacion(tag, summary, {
  publica = false, status = 200, salida = objeto({}, []), body, media, parametros,
  errores = [], binario = false, tipoBinario = "application/octet-stream",
  descripcion, ejemplo, ejemploSalida, bodyOpcional = false, mediaSalida,
} = {}) {
  const respuestas = new Set([...(publica ? [] : [401, 403]), ...errores, ...(body && !media ? [413] : []), 500]);
  const documentarContenido = (schema, tipo = "application/json", valor) =>
    Object.fromEntries([tipo].flat().map((mediaType) => [mediaType, { schema, ...(valor !== undefined && { example: valor }) }]));
  return {
    tags: [tag], summary,
    ...((descripcion || tag === "IA") && {
      description: [tag === "IA" && "Disponible con IA_HABILITADA=true en el backend.", descripcion].filter(Boolean).join(" "),
    }),
    ...(publica && { security: [] }),
    ...(parametros && { parameters: parametros }),
    ...(body && { requestBody: { required: !bodyOpcional, content: documentarContenido(body, media, ejemplo) } }),
    responses: {
      [status]: { description: "Operación exitosa", ...(status !== 204 && {
        content: documentarContenido(binario ? archivo : salida, binario ? tipoBinario : mediaSalida, ejemploSalida),
        ...(binario && { headers: { "Content-Disposition": { schema: texto } } }),
      }) },
      ...Object.fromEntries([...respuestas].map((codigo) => [
        codigo, { description: mensajes[codigo], content: documentarContenido(ref("Mensaje"), undefined, { mensaje: mensajes[codigo] }) },
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
const editarOferta = { body: ref("DatosOferta"), salida: ref("Oferta"), errores: [400], ejemplo: ofertaEjemplo };
const solicitudEjemplo = {
  candidatoNombre: "Persona ficticia", candidatoCorreo: "postulante@example.invalid", candidatoTelefono: "+56 9 0000 0000",
  cargo: ofertaEjemplo.cargo, familiaDeCargo: idEjemplo, profesionalResponsable: idEjemplo,
  fechaEvaluacion: "2026-11-25T14:00:00.000Z", observaciones: "Ficha académica",
};
const evaluacionEjemplo = { fechaEvaluacion: "2026-11-20", resultado: "Observación ficticia", estado: "Finalizada" };
const tipoWord = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default {
  openapi: "3.0.3",
  info: { title: "AquaChile · Evaluación psicolaboral", version: "3.0.0" },
  servers: [{ url: "/api" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Mensaje: objeto({ mensaje: texto }, ["mensaje"]),
      Usuario: { ...objeto({ id, _id: id, nombre: texto, correo: texto, rol: { ...texto, enum: ["analista", "evaluador", "admin"] } }), example: usuarioEjemplo },
      DatosOferta: objeto({ ...datosOferta, ...ofertaProfesional, ...requisitosOferta }, Object.keys(datosOferta)),
      Oferta: objeto({ ...datosOferta, ...ofertaProfesional, ...requisitosOferta, _id: id, familiaDeCargo: { oneOf: [id, familia] }, estado: estadosPublicacion, fechaPublicacion: { ...fecha, nullable: true } }),
      AntecedentesPreseleccion: antecedentesPreseleccion,
      Preseleccion: preseleccion,
      Candidato: { ...objeto({ _id: id, nombre: texto, correo: texto, telefono: texto, origen: texto }), example: candidatoEjemplo },
      Archivo: { ...objeto({ _id: id, nombreOriginal: texto, mimeType: texto, tamano: { type: "integer" }, tipo: { ...texto, enum: ["cv", "informe"] }, fecha }), example: archivoEjemplo },
      Solicitud: objeto({ _id: id, cargo: texto, oferta: id, candidato: ref("Candidato"), familiaDeCargo: familia,
        cvPostulacion: referenciaPoblada("Archivo"), informePostulacion: referenciaPoblada("Archivo"),
        profesionalResponsable: referenciaPoblada("Usuario"), preseleccion: ref("Preseleccion"),
        estado: estados, fechaEvaluacion: { ...fecha, nullable: true }, observaciones: texto, mensajeAdicional: texto,
        resultado: resultadoHumano }),
      Evaluacion: objeto({ ...datosEvaluacion.properties, _id: id, solicitud: id, fechaEvaluacion: fecha }),
    },
  },
  paths: {
    "/health": { get: operacion("Operación", "Comprobar disponibilidad HTTP", { publica: true,
      salida: objeto({ estado: texto }), ejemploSalida: { estado: "ok" } }) },
    "/docs": { get: operacion("Operación", "Abrir Swagger UI", { publica: true, salida: texto, mediaSalida: "text/html" }) },
    "/docs/openapi.json": { get: operacion("Operación", "Descargar contrato OpenAPI", { publica: true }) },
    "/auth/login": { post: operacion("Autenticación", "Iniciar sesión", { publica: true, body: credenciales, errores: [400, 401],
      salida: objeto({ token: texto, usuario: ref("Usuario") }), ejemplo: inicioEjemplo }) },
    "/auth/perfil": { get: operacion("Autenticación", "Consultar perfil", { salida: ref("Usuario"), errores: [404] }) },
    "/auth/registro": { post: operacion("Usuarios", "Crear usuario interno (admin)", { status: 201,
      body: objeto({ ...credenciales.properties, nombre: texto, rol: { ...texto, enum: ["analista", "evaluador"] } }, ["nombre", "correo", "password"]),
      salida: objeto({ mensaje: texto, usuario: ref("Usuario") }), errores: [400, 409],
      ejemplo: { ...inicioEjemplo, nombre: usuarioEjemplo.nombre, rol: usuarioEjemplo.rol } }) },
    "/usuarios": { get: operacion("Usuarios", "Listar usuarios (admin/analista)", { parametros: [consulta("rol")], salida: lista(ref("Usuario")) }) },
    "/familias": { get: operacion("Ofertas", "Listar familias internas", { salida: lista(familia) }) },
    "/dashboard": { get: operacion("Solicitudes", "Consultar indicadores del flujo según el rol", {
      salida: objeto(Object.fromEntries(["totalCandidatos", "solicitudesPendientes", "solicitudesEnProceso", "solicitudesFinalizadas"]
        .map((campo) => [campo, { type: "integer", minimum: 0 }]))),
      ejemploSalida: { totalCandidatos: 3, solicitudesPendientes: 1, solicitudesEnProceso: 1, solicitudesFinalizadas: 1 },
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
      ...lecturaOferta, body: objeto({ publicada: { type: "boolean" } }, ["publicada"]), errores: [400, 404], ejemplo: { publicada: true },
    }) },
    "/ofertas/publicas": { get: operacion("Ofertas", "Buscar ofertas publicadas", {
      publica: true, parametros: filtrosOferta, salida: lista(ref("Oferta")), errores: [400], ejemploSalida: [ofertaPublicadaEjemplo],
    }) },
    "/ofertas/publicas/{id}": { get: operacion("Ofertas", "Ver una oferta publicada", { ...lecturaOferta, publica: true, ejemploSalida: ofertaPublicadaEjemplo }) },
    "/postulaciones/familias": { get: operacion("Postulaciones", "Listar familias públicas", { publica: true, salida: lista(familia), errores: [429] }) },
    "/postulaciones": { post: operacion("Postulaciones", "Postular con ofertaId, o con cargo y familiaDeCargo para el formulario general", {
      publica: true, status: 201, body: postulacion, media: multipart, salida: ref("Mensaje"), errores: [400, 404, 409, 429, 503],
      descripcion: "Usa ofertaId o el par cargo y familiaDeCargo. El CV es obligatorio. Se admite PDF, DOC o DOCX de hasta 5 MB.",
      ejemplo: { nombre: "Persona ficticia", correo: "postulante@example.invalid", telefono: "+56 9 0000 0000", ofertaId: idEjemplo,
        antecedentes: '{"nivelEstudios":"tecnico","experienciaAnios":1}' },
    }) },
    "/solicitudes": {
      get: operacion("Solicitudes", "Listar solicitudes con candidatos. Evaluador: solo asignadas", { salida: lista(ref("Solicitud")) }),
      post: operacion("Solicitudes", "Crear solicitud y candidato (admin/analista)", {
        status: 201, media: multipart, body: datosSolicitud, salida: ref("Solicitud"), errores: [400, 404],
        ejemplo: solicitudEjemplo,
      }),
    },
    "/solicitudes/{id}": {
      get: operacion("Solicitudes", "Consultar solicitud, candidato y metadatos del CV", { ...porId, salida: ref("Solicitud") }),
      put: operacion("Solicitudes", "Editar o asignar responsable (admin/analista)", {
        ...porId, media: multipart, body: datosSolicitud, salida: ref("Solicitud"), errores: [400, 404],
        ejemplo: solicitudEjemplo,
      }),
      delete: operacion("Solicitudes", "Eliminar solicitud (admin)", { ...porId, salida: ref("Mensaje") }),
    },
    "/solicitudes/{id}/estado": { patch: operacion("Solicitudes", "Cambiar estado y resultado (admin/analista)", {
      ...porId, body: objeto({ estado: estados, resultado: resultadoHumano }, ["estado"]),
      salida: ref("Solicitud"), errores: [400, 404], ejemplo: { estado: "Finalizada", resultado: "Rechazada" },
      descripcion: "Solo admin o analista. Un resultado no nulo requiere Finalizada. null quita el resultado. Pasar a En proceso o Finalizada requiere evaluador.",
    }) },
    "/solicitudes/{id}/preseleccion": { get: operacion("Preselección", "Consultar resultado, antecedentes y auditoría (admin/analista/evaluador asignado)", {
      ...porId, salida: objeto({ preseleccion: ref("Preseleccion"), antecedentes: ref("AntecedentesPreseleccion"),
        historial: lista(objeto({ ...registroPreseleccion, resultadoAnterior: ref("Preseleccion"), antecedentesAnteriores: ref("AntecedentesPreseleccion") })) }),
    }) },
    "/solicitudes/{id}/preseleccion/recalcular": { post: operacion("Preselección", "Recalcular con los criterios vigentes y guardar el resultado previo (admin/analista)", {
      ...porId, errores: [400, 404, 409], body: objeto({ motivo: motivoPreseleccion, antecedentes: ref("AntecedentesPreseleccion") }, ["motivo"]),
      salida: objeto({ preseleccion: ref("Preseleccion") }), ejemplo: { motivo: "Verificación académica", antecedentes: { experienciaAnios: 1 } },
    }) },
    "/solicitudes/{id}/preseleccion/continuar": { post: operacion("Preselección", "Autorizar continuidad manual sin cambiar el resultado (admin/analista)", {
      ...porId, errores: [400, 404, 409], body: objeto({ motivo: motivoPreseleccion }, ["motivo"]),
      salida: objeto({ preseleccion: ref("Preseleccion") }), ejemplo: { motivo: "Verificar experiencia en entrevista" },
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
    "/solicitudes/{id}/informe-entrevista": { put: operacion("Archivos", "Adjuntar informe Word (admin/analista/evaluador asignado)", {
      ...porId, media: multipart, body: objeto({ informe: { ...archivo, description: "DOC o DOCX de hasta 5 MB" } }, ["informe"]),
      salida: objeto({ informeArchivo: ref("Archivo") }), errores: [400, 404],
      descripcion: "Puede reemplazar el documento del expediente aun con la solicitud finalizada.",
    }) },
    "/solicitudes/{id}/pauta-entrevista": { get: operacion("Archivos", "Descargar la pauta Word de la familia. Evaluador: solo asignadas", {
      ...porId, binario: true, tipoBinario: tipoWord,
    }) },
    "/archivos/{id}": { get: operacion("Archivos", "Descargar archivo privado. Evaluador: solo asignadas", {
      ...porId, binario: true, tipoBinario: ["application/pdf", "application/msword", tipoWord],
    }) },
    "/solicitudes/{id}/evaluaciones": {
      get: operacion("Evaluaciones", "Listar evaluaciones de una solicitud", { ...porId, salida: lista(ref("Evaluacion")) }),
      post: operacion("Evaluaciones", "Registrar evaluación (responsable/admin)", {
        ...porId, status: 201, body: datosEvaluacion, salida: ref("Evaluacion"), errores: [400, 404, 409],
        ejemplo: evaluacionEjemplo,
      }),
    },
    "/evaluaciones/{id}": { put: operacion("Evaluaciones", "Actualizar evaluación (responsable/admin)", {
      ...porId, body: datosEvaluacion, salida: ref("Evaluacion"), errores: [400, 404, 409], ejemplo: evaluacionEjemplo,
    }) },
    [rutaInforme]: {
      get: operacion("IA", "Leer informe psicolaboral", { ...porId, salida: { ...informeGuardado, nullable: true } }),
      put: operacion("IA", "Guardar informe revisado (responsable/admin)", { ...porId, body: datosInforme, salida: informeGuardado, errores: [400, 404, 409], ejemplo: informeEjemplo }),
    },
    [`${rutaInforme}/generar`]: { post: operacion("IA", "Generar borrador desde apuntes ficticios (responsable/admin)", {
      ...ia, body: objeto({ apuntes: { ...texto, minLength: 1, maxLength: 20000 }, instrucciones: { ...texto, maxLength: 2000 } }, ["apuntes"]),
      salida: objeto({ secciones: datosInforme.properties.secciones, modeloIa: texto, generadoEn: fecha }),
      ejemplo: { apuntes: "Apuntes ficticios de entrevista", instrucciones: "Breve" },
    }) },
    [rutaNota]: {
      get: operacion("IA", "Leer evaluación de apoyo", { ...porId, salida: { ...apoyo, nullable: true } }),
      put: operacion("IA", "Guardar evaluación de apoyo revisada (responsable/admin)", { ...porId, body: apoyo, salida: apoyo, errores: [400, 404, 409],
        ejemplo: { puntajeGlobal: 50, competencias: [], fortalezas: [], areasDeMejora: [], recomendaciones: [], resumen: "Ejemplo orientativo" } }),
    },
    [`${rutaNota}/generar`]: { post: operacion("IA", "Generar evaluación de apoyo con archivos ficticios (responsable/admin)", {
      ...ia, body: objeto({ apuntes: texto }), bodyOpcional: true, salida: apoyo, ejemplo: { apuntes: "Observación ficticia opcional" },
    }) },
    "/solicitudes/{id}/preguntas-entrevista/generar": { post: operacion("IA", "Sugerir preguntas generales y verificar requisitos excluyentes (responsable/admin)", {
      ...ia, salida: objeto({
        preguntas: lista(texto), modelo: { ...texto, nullable: true },
        preguntasVerificacion: lista(objeto({ pregunta: texto, requisito: texto, motivo: { ...texto, enum: ["Pendiente", "No cumple"] } })),
        aviso: { ...texto, description: "Cuando Gemini falla y existen requisitos verificables, el 200 incluye solo las verificaciones locales y este aviso." },
      }),
    }) },
  },
};
