# AquaChile · Guía EA3

## Arquitectura y datos

React, Vite y Bootstrap construyen el portal público y el panel. Axios conecta el frontend de Vercel con la API Express de Render. Mongoose guarda el flujo y los archivos en MongoDB Atlas. Gemini recibe las peticiones desde Express.

### Referencia profesional AquaChile

El portal de empleo de AquaChile organiza las vacantes por área, ofrece búsqueda por palabra clave y presenta título, área, región y fecha. Sus fichas separan objetivo, funciones, requisitos y beneficios. Esta demo adopta esa jerarquía con componentes Bootstrap propios y descripciones, condiciones y remuneraciones redactadas para la evaluación. [Portal de empleos](https://trabajos.aquachile.com/content?locale=es_ES) · [Listado por área](https://trabajos.aquachile.com/go/ADMINISTRACI%C3%93N-Y-FINANZAS/4643319/) · [Ejemplo de ficha oficial](https://trabajos.aquachile.com/job/LOS-LAGOS-Asistente-Laboratorio-Planta-Alimentos%2C-Pargua_-LOS/1337605762/).

En **Gestionar ofertas → Nueva oferta → Cargar ejemplo ficticio** puedes cargar Analista de Operaciones, Técnico de Mantención, Analista de Abastecimiento o Práctica Profesional en Administración. Revisa y edita el formulario antes de guardar. Si la familia sugerida no existe en tu base, elige una equivalente. Para demostrar filtros combinados, guarda y publica Analista de Operaciones y Técnico de Mantención. Las dos usan la familia Operaciones y se distinguen por área, región y modalidad. El portal obtiene los avisos publicados desde la API.

| Modelo | Relación en el flujo |
| --- | --- |
| `Oferta` | Pertenece a una `FamiliaDeCargo`. Admite área, región, ciudad o ubicación, objetivo, experiencia, estudios y conocimientos. Los campos nuevos son opcionales para las ofertas existentes. Maneja borrador, publicada y archivada. La API fija la fecha al publicar. Archivar conserva la referencia histórica. |
| `Candidato` | Se busca por correo normalizado. El formulario público reutiliza un candidato existente y conserva sus datos de contacto. El índice de identidad controla altas simultáneas del portal. |
| `Solicitud` | Representa la postulación y su evaluación psicolaboral desde el estado Pendiente. Guarda oferta, candidato, CV, adjunto de entrevista, mensaje adicional, familia y cargo registrados al postular. El índice único por oferta y correo evita duplicados. |
| `Archivo` | Conserva binario, metadatos, clave privada y referencia a la solicitud para adjuntos asociados a ofertas. |
| `Evaluacion`, `Informe` | Asociados a la solicitud. El informe y la evaluación de apoyo conservan sus mecanismos de revisión y guardado. |
| `Usuario` | Tiene rol interno. La solicitud enlaza al usuario evaluador responsable. |

El formulario general `/postular` y la creación manual del panel siguen disponibles. Las solicitudes de esos flujos conservan los archivos asociados al candidato.

## CV privado

Para una oferta, el backend valida extensión, tipo MIME, firma inicial y tamaño máximo de 5 MB. Guarda los bytes en `Archivo.datos` en la base privada. La transacción crea o reutiliza el candidato, persiste el CV y registra la solicitud. Un error al guardar revierte la operación. Se requiere MongoDB con replica set. Atlas ya ofrece esa topología.

Al registrar la primera postulación se fija el contenedor lógico del candidato. Ejemplo con datos ficticios:

```text
postulantes/camila-ficticia-<id-candidato>/cv/<id-solicitud>/<uuid>-CV_Ficticio.pdf
```

La clave vive en MongoDB. El ID identifica al candidato, el subdirectorio identifica la solicitud y el UUID distingue cada archivo. Dos ofertas pueden compartir candidato y contenedor con CV distintos. El archivo original se puede descargar desde el detalle de solicitud. También puedes consultar el nombre del contenedor desde Swagger con `GET /api/solicitudes/{id}/carpeta` y JWT.

## HTTP, JWT y roles

Swagger UI abre en `http://localhost:4000/api/docs`. El contrato JSON se sirve en `/api/docs/openapi.json`. Inicia sesión con `POST /api/auth/login` y usa **Authorize** para pegar el token. El frontend restaura el token desde `localStorage` y lo elimina al cerrar sesión o cuando la API devuelve 401 en una ruta privada. El token caduca según `JWT_EXPIRES_IN`.

| Operación | Acceso |
| --- | --- |
| Buscar y ver ofertas publicadas, enviar postulación | Público. El servidor resuelve el cargo y la familia desde la oferta y el envío tiene límite por IP. |
| Crear, editar, publicar, despublicar y archivar ofertas | Analista y administrador. |
| Gestionar solicitudes, responsable, fechas y resultado final | Analista y administrador. El administrador puede eliminar solicitudes. |
| Consultar solicitudes, evaluaciones, dashboard y adjuntos | Analista y administrador. El evaluador solo accede a solicitudes asignadas y a sus adjuntos. |
| Registrar evaluación y solicitar preguntas con IA | Evaluador responsable y administrador. |
| Crear usuarios internos | Administrador. |

La descarga `GET /api/archivos/{id}` entrega un adjunto privado con JWT. El navegador público recibe solo una confirmación textual de la postulación. El backend comprueba la asignación antes de autorizar una descarga para un evaluador, incluso si este conoce el ID del archivo.

## Ejecución local

Usa Node.js 24 y npm. En PowerShell puedes usar `npm.cmd` si la política de ejecución bloquea `npm.ps1`. Crea una base académica separada en Atlas o inicia un replica set local. Ejemplo en Docker, con el puerto publicado para uso local.

```powershell
docker run -d --name aquachile-ea3-mongo -p 127.0.0.1:27017:27017 -v aquachile-ea3-db:/data/db mongo:8.0 --replSet rs0 --bind_ip_all
'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})' | docker exec -i aquachile-ea3-mongo mongosh --quiet
```

Después de que MongoDB elija un nodo primario, copia `backend/.env.example` y `frontend/.env.example` a `.env` dentro de sus directorios. Si usas Atlas, apunta `MONGO_URI` a la base de la demo y autoriza la IP del entorno que ejecuta la API. Configura un JWT secreto propio para esa base.

En `backend` ejecuta `npm ci`. Para inicializar **solo la base académica**, configura `SEED_PASSWORD` en el `.env` local, ejecuta `npm run seed` para cargar familias y `npm run seed-usuarios` para crear los usuarios de demostración. Inicia con `npm run dev`.

En `frontend` ejecuta `npm ci` y `npm run dev`. Abre `http://localhost:5173/ofertas`.

### Variables

| Entorno | Variable | Configuración para EA3 |
| --- | --- | --- |
| API | `MONGO_URI` | Base privada Atlas o réplica local. Usa un usuario con permisos sobre la base, sus colecciones e índices. |
| API | `PORT` | 4000 en local. Render asigna el puerto de servicio. |
| API | `JWT_SECRET`, `JWT_EXPIRES_IN` | Secreto privado propio y caducidad, por defecto `1d`. |
| Seed académico | `SEED_PASSWORD` | Contraseña local elegida para las cuentas del seed. El script requiere este valor y lo mantiene fuera de su salida. |
| API | `CORS_ORIGIN` | Orígenes exactos del frontend, separados por coma. Usa `http://localhost:5173` en local. |
| API | `IA_HABILITADA`, `GEMINI_API_KEY` | `true` y una clave habilitada para el proyecto en Google AI Studio. Sin clave, las peticiones de generación devuelven un 503 explicativo. |
| API | `GEMINI_MODEL` | Modelo habilitado para la clave. El ejemplo usa `gemini-3.8-flash`. |
| API | `GEMINI_MODEL_RESPALDO`, `GEMINI_NIVEL_RAZONAMIENTO`, `GEMINI_ESPERAS_REINTENTO_MS` | Opcionales. El ejemplo describe ajustes de modelo, razonamiento y esperas ante 503. |
| Web | `VITE_API_URL` | Origen de Express más `/api`. |
| Web | `VITE_IA_HABILITADA` | `true` para mostrar los controles EA3. Se lee al compilar. |

El CV reutiliza `MONGO_URI`. Las claves y credenciales se configuran fuera del repositorio. Comprueba que el modelo elegido esté disponible para tu proyecto. [Modelos de la API de Gemini](https://ai.google.dev/gemini-api/docs/models).

## IA en la demostración

Después de asignar un evaluador, entra con esa cuenta y elige **Sugerir preguntas** en la solicitud. La API envía el cargo y su familia a Gemini y devuelve hasta cinco preguntas. El resultado queda en la vista y se revisa manualmente. La IA puede generar preguntas genéricas o imprecisas. El estado y el resultado final los registra el equipo interno.

Para esta demo utiliza cargos, archivos y apuntes ficticios. La función de preguntas usa únicamente el cargo y la familia. Las funciones preexistentes de borrador de informe y evaluación de apoyo usan los apuntes o documentos que selecciona el evaluador.

## Pruebas y cobertura

- En `frontend`, ejecuta `npm run test:cobertura`, `npm run lint` y `npm run build`. El informe HTML queda en `frontend/coverage/index.html`. React Testing Library y `user-event` prueban la UI. Las respuestas de la API se controlan en la prueba.
- En `backend`, ejecuta `npm run test:cobertura`. El conjunto usa `node:test` y un replica set MongoDB temporal iniciado por `mongodb-memory-server-core`. La primera ejecución baja un binario de MongoDB y requiere conexión y espacio para extraerlo. Si el binario ya existe, puedes indicar su ruta en `MONGOMS_SYSTEM_BINARY` o fijar `MONGOMS_DOWNLOAD_DIR` para el caché. La suite usa datos inventados y un servidor HTTP local. Las respuestas de Gemini son simuladas. La cobertura reportada aplica al código de la API cargado por las suites bajo `backend/src`.
- Para resultados medidos y comparativa EP2 consulta [Cobertura](cobertura-testing.md).

## Despliegue de la versión EA3

1. En el servicio de Render configura `backend` como directorio raíz. Usa Node 24, `npm ci` como build y `npm start` como comando de inicio. Configura las variables de API de la tabla. Usa un entorno de demostración con usuarios y datos ficticios.
2. Confirma que el usuario de Atlas puede crear las colecciones e índices. Los modelos de EA3 se inicializan antes de aceptar peticiones. Revisa `/api/health` y `/api/docs` en el origen de Render.
3. En Vercel configura `frontend` como raíz, Vite como preset, `npm run build` y `dist` como salida. Mantén el rewrite SPA de `frontend/vercel.json`. Configura `VITE_API_URL=https://<servicio-render>/api` y `VITE_IA_HABILITADA=true`. Recompila al cambiar variables `VITE_*`.
4. Valida el flujo en una vista previa con la base académica antes de promover esa versión. Conserva los despliegues previos y deja fuera los archivos `.env`.

## Pauta de entrevista por familia

En el detalle de la solicitud, sobre **Subir informe de entrevista**, el analista, el administrador o el evaluador asignado puede pulsar **Descargar pauta de entrevista**. La pantalla indica la familia de cargo. `GET /api/solicitudes/{id}/pauta-entrevista` requiere Bearer JWT, verifica el acceso a esa solicitud y descarga el DOCX maestro de la familia desde `backend/plantillas/`. Las pautas están versionadas con el backend y la descarga funciona sin las copias locales de candidatos. Ante una familia sin pauta disponible, el servicio responde 404 y la carga sigue habilitada.

1. Abre la solicitud y descarga la pauta específica de su familia.
2. Durante o después de la entrevista, registra respuestas, ejemplos observables y observaciones. Guarda el documento completado en Word.
3. Súbelo como DOC o DOCX de hasta 5 MB mediante **Subir informe de entrevista**. El adjunto queda privado en MongoDB.
4. Como evaluador asignado o administrador, usa **Generar evaluación con IA** con el CV y el informe. Revisa el apoyo generado y registra las decisiones de forma manual.

## Guion de presentación

1. Entra como analista o admin. En **Gestionar ofertas** crea un cargo ficticio o precarga **Analista de Operaciones**, revisa su objetivo y perfil, y guarda el borrador. Verifica que aún no figure en el portal público.
2. Publica la oferta. Abre **Ofertas laborales** en una ventana privada, busca por cargo o palabra clave, filtra por familia, área, región o modalidad y elige **Ver oferta**. Muestra la misión, las funciones y los requisitos de la ficha.
3. Pulsa **Postular**. Usa el nombre **Camila Ficticia**, `camila@example.invalid`, `+56 9 0000 0000` y un PDF o DOCX inventado. Envía el formulario.
4. Vuelve al **Panel** como analista. Abre la solicitud nueva en **Pendiente**. Descarga el CV y muestra en Swagger la carpeta lógica de la solicitud. Prueba la misma URL directa con una sesión sin asignación para mostrar el 403.
5. Asigna al evaluador y registra una fecha y observaciones ficticias. Mueve la solicitud a **En proceso**.
6. Entra como ese evaluador, abre su solicitud, registra una evaluación y pulsa **Sugerir preguntas**. Revisa el resultado como apoyo a la entrevista.
7. Regresa a la sesión de analista o administrador. Cambia a **Finalizada** y, si corresponde, registra manualmente el resultado.
8. Despublica la oferta. Comprueba que deja de aparecer en el portal y que la solicitud histórica sigue en el Panel.

## Inventario de entrega

### Archivos nuevos

- `backend/README.md`
- `backend/src/models/Oferta.js`
- `backend/src/openapi.js`
- `backend/src/routes/docsRoutes.js`
- `backend/src/routes/ofertaRoutes.js`
- `backend/src/services/postulacionOferta.js`
- `backend/test/ea3.test.js`
- `docs/guia-ea3.md`
- `frontend/src/components/PreguntasEntrevista.jsx`
- `frontend/src/config/ofertasDemostracion.js`
- `frontend/src/pages/GestionOfertas.jsx`
- `frontend/src/pages/OfertasPublicas.jsx`
- `frontend/src/pruebas/ea3.spec.jsx`
- `frontend/src/services/ofertaService.js`

### Archivos modificados

- `README.md`
- `backend/.env.example`
- `backend/package-lock.json`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/config/db.js`
- `backend/src/controllers/archivoController.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/dashboardController.js`
- `backend/src/controllers/evaluacionController.js`
- `backend/src/controllers/informeController.js`
- `backend/src/controllers/postulacionController.js`
- `backend/src/controllers/solicitudController.js`
- `backend/src/middleware/auth.js`
- `backend/src/models/Archivo.js`
- `backend/src/models/Candidato.js`
- `backend/src/models/Solicitud.js`
- `backend/src/routes/dashboardRoutes.js`
- `backend/src/routes/postulacionRoutes.js`
- `backend/src/routes/solicitudRoutes.js`
- `backend/src/seed/seedUsuarios.js`
- `backend/src/server.js`
- `backend/src/services/servicioIa.js`
- `backend/src/utils/validarArchivo.js`
- `docs/cobertura-testing.md`
- `docs/guia-testing.md`
- `frontend/.env.example`
- `frontend/README.md`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/src/App.jsx`
- `frontend/src/components/EtiquetaPostulacionPublica.jsx`
- `frontend/src/components/NavbarPublico.jsx`
- `frontend/src/components/SolicitudFormulario.jsx`
- `frontend/src/hooks/useValidacionFormulario.js`
- `frontend/src/layouts/enlaces.js`
- `frontend/src/pages/Postular.jsx`
- `frontend/src/pages/SolicitudDetalle.jsx`
- `frontend/src/pruebas/layouts.spec.jsx`
- `frontend/src/services/informeService.js`
- `frontend/src/services/postulacionService.js`
- `frontend/vite.config.js`
