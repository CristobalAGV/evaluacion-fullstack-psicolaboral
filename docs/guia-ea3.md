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

## Preselección objetiva

**Oferta → requisitos estructurados → postulación → preselección objetiva → revisión humana → evaluación psicolaboral → IA como apoyo → decisión final humana.**

La preselección no toma decisiones automáticas de contratación. Solo contrasta los antecedentes declarados con requisitos explícitos de la oferta y ayuda a priorizar la revisión humana. Utiliza exclusivamente campos laborales. La persona postulante recibe una confirmación y los resultados se consultan en el panel interno.

- En la oferta, `requisitosEstructurados` incluye nivel mínimo, carreras aceptadas, experiencia mínima, conocimientos, certificaciones, licencia, disponibilidad y modalidades. `requisitosDeseables` incluye conocimientos e industrias. Ambos complementan el texto narrativo.
- La postulación con oferta admite nivel, carrera, experiencia, conocimientos, certificaciones, licencia, disponibilidad, modalidades e industrias. Cada solicitud conserva sus propios antecedentes, aunque el candidato postule a otra oferta. Un campo omitido se distingue de un cero, de un «No» y de una lista declarada vacía.
- El motor v1 compara niveles en orden Media → Técnico → Profesional → Postgrado. La experiencia declarada debe alcanzar el mínimo. Basta una carrera o modalidad admitida. Cada conocimiento y certificación configurados cuenta como un criterio independiente. Las coincidencias de texto ignoran mayúsculas, tildes y espacios repetidos. Emplea coincidencias exactas tras esa normalización, de modo que equivalencias como «Ingeniero industrial» e «Ingeniería industrial» requieren revisión y corrección documentada.
- Un excluyente incumplido produce **No cumple**. Si ninguno se incumple, pero falta algún dato excluyente, produce **Revisión**. En los demás casos produce **Cumple**. Un deseable puede afectar el porcentaje sin cambiar el estado. Cuando hay ambos grupos, la fórmula es `redondear(80 × excluyentes cumplidos/configurados + 20 × deseables cumplidos/configurados)`. Si se configura un único grupo, representa todo el porcentaje. Los faltantes aportan cero y figuran por separado. Las ofertas sin criterios y las solicitudes antiguas conservan el flujo habitual.
- La solicitud conserva criterios aplicados, fecha, versión, porcentaje y el resultado de cada comparación. Una edición de oferta no cambia la preselección existente. **Recalcular preselección** usa los criterios vigentes y conserva los antecedentes, el resultado anterior y la continuidad anterior en el historial. Puede incorporar correcciones de antecedentes con un motivo. **Continuar a evaluación** registra motivo, usuario y fecha, y mantiene el resultado objetivo. Un recálculo puede requerir una nueva autorización.
- Consulta autenticada en `GET /api/solicitudes/{id}/preseleccion`. Analista y administrador pueden consultar y usar `POST .../recalcular` y `POST .../continuar`. El evaluador puede consultar las solicitudes asignadas. Una solicitud finalizada conserva la consulta en solo lectura. Las rutas de IA requieren continuidad cuando corresponda y conservan sus permisos previos.
- Para demostrarlo, carga **Analista de Operaciones** como oferta ficticia y publícala. Postula con datos ficticios, título «Ingeniería industrial», nivel Técnico o Profesional, 1 año, «Excel intermedio» y «SAP». Usa otra postulación ficticia con 0 años, o deja la experiencia en blanco para revisar el caso de información pendiente. En Pendientes compara las tarjetas, activa el orden por coincidencia y registra la continuidad desde el detalle. Las ofertas de ejemplo son material académico.

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

Las llamadas al portal público, al formulario de postulación y al login omiten el JWT incluso cuando hay sesión. Un 401 privado limpia la sesión local y un 403 conserva la sesión. El token de `localStorage` puede ser leído por código que se ejecute en el origen del frontend. Usa HTTPS, mantén acotada la vigencia con `JWT_EXPIRES_IN` y evita inyectar HTML o scripts de terceros. Cerrar sesión elimina la copia del navegador. El token emitido conserva su vigencia hasta expirar.

### Solicitudes finalizadas

| Operación | Regla vigente |
| --- | --- |
| Consultar y descargar expediente, informe y evaluaciones | Administrador, analista y evaluador actualmente asignado. |
| Generar preguntas, generar o guardar el informe y el apoyo IA, crear o editar evaluación humana | Solo administrador o evaluador asignado en una solicitud activa, con los requisitos de continuidad que correspondan. La API rechaza las escrituras sobre una solicitud finalizada con 409. |
| Corregir fecha, responsable, observaciones o resultado humano | Administrador y analista. Una corrección puede conservar `Finalizada`. La reapertura elimina el resultado vigente y puede habilitar otra vez la edición. |
| Reemplazar CV | Administrador y analista, también después del cierre. |
| Reemplazar Word de entrevista | Administrador, analista y evaluador asignado, también después del cierre. Es un adjunto independiente del informe psicolaboral. |

Estas correcciones conservan las evaluaciones e informes guardados. Si el responsable cambia, el acceso del evaluador al expediente sigue la asignación vigente. La fecha programada en la solicitud es una fecha con hora. La fecha de una evaluación humana representa un día de calendario. Antes de fijar una política de expediente inmutable, conviene decidir quién puede corregir anexos y si esas correcciones deben guardar un motivo e historial. Los archivos antiguos que solo existan en el disco efímero de Render podrían quedar indisponibles después de un reinicio o despliegue.

Swagger incluye ejemplos ficticios de login, oferta, postulación, preselección, resultado humano e informes. El candidato se consulta como parte del detalle autorizado de la solicitud y los metadatos del expediente. Las operaciones de IA requieren `IA_HABILITADA=true` en el backend.

La validación de accesibilidad de esta revisión fue estática y con el DOM de las pruebas. El modal mantiene el foco, excluye los campos ocultos y controles con tabulación negativa, y devuelve el foco al botón que lo abrió. Queda por comprobar el renderizado a 390, 768 y 1440 px. En el navegador, revisa primero el menú privado, el Kanban y los formularios largos, y luego confirma foco visible, contraste, ausencia de desbordamiento y uso por teclado en los formularios, adjuntos y barras de IA.

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
| API | `CORS_ORIGIN` | Orígenes exactos separados por coma, sin rutas ni barra final. En Render usa el origen HTTPS definitivo de Vercel, por ejemplo `https://frontend.example.invalid`. Sin configuración, producción omite el permiso CORS y desarrollo admite `http://localhost:5173` y `http://127.0.0.1:5173`. Para otro puerto de Vite, configura su origen explícitamente. |
| API | `NODE_ENV` | Usa `production` en Render. Esto también aplica el comportamiento restrictivo de CORS cuando se omite su lista de orígenes. |
| API | `IA_HABILITADA`, `GEMINI_API_KEY` | `true` y una clave habilitada para el proyecto en Google AI Studio. Sin clave, las peticiones de generación devuelven un 503 explicativo. |
| API | `GEMINI_MODEL` | Modelo habilitado para la clave. El ejemplo usa `gemini-3.8-flash`. |
| API | `GEMINI_MODEL_RESPALDO`, `GEMINI_NIVEL_RAZONAMIENTO`, `GEMINI_ESPERAS_REINTENTO_MS` | Opcionales. El ejemplo describe ajustes de modelo, razonamiento y esperas ante 503. |
| Web | `VITE_API_URL` | Origen de Express más `/api`. |
| Web | `VITE_IA_HABILITADA` | `true` para mostrar los controles EA3. Se lee al compilar. |

El CV reutiliza `MONGO_URI`. Las claves y credenciales se configuran fuera del repositorio. Comprueba que el modelo elegido esté disponible para tu proyecto. [Modelos de la API de Gemini](https://ai.google.dev/gemini-api/docs/models).

## IA en la demostración

**Oferta → Postulación → Preselección → Revisión humana → Preguntas generales y de verificación → Entrevista → Evaluación psicolaboral → Decisión humana.**

Después de asignar un evaluador, entra con esa cuenta y elige **Sugerir preguntas**. Para una solicitud en **Revisión** o **No cumple**, primero se necesita una autorización de continuidad registrada por analista o administrador. En solicitudes finalizadas la generación está bloqueada en la API y el botón no aparece.

Gemini sugiere hasta cinco preguntas generales sobre el cargo. Con cinco o más verificaciones la solicitud a Gemini se limita a tres preguntas generales. Desde la comparación guardada, el backend agrega una pregunta por cada excluyente pertinente pendiente o incumplido. El detalle muestra el requisito y el motivo **Pendiente** o **No cumple**. Un año de experiencia sin declarar se verifica preguntando por trabajos, prácticas o proyectos, su duración y las responsabilidades. El evaluador verifica la respuesta durante la entrevista.

El endpoint conserva `preguntas` y `modelo` y agrega `preguntasVerificacion`. Si Gemini falla y hay verificaciones, devuelve un aviso y las preguntas locales. Ante un fallo sin verificaciones, mantiene el error habitual de la API. Las sugerencias se mantienen temporalmente en la pantalla. Generar preguntas no cambia la solicitud, la preselección, su porcentaje ni el resultado final.

Para esta demo utiliza cargos, archivos y apuntes ficticios. La función de preguntas envía el cargo, la familia y, si corresponde, los tipos de requisitos por verificar, sus motivos y el indicador booleano de continuidad. Los antecedentes declarados, las etiquetas libres de requisitos, el motivo escrito de continuidad, los datos de contacto y los documentos quedan fuera de esta llamada. Las funciones preexistentes de borrador de informe y evaluación de apoyo usan los apuntes o documentos que selecciona el evaluador.

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

Desde **Ver detalle**, la tarjeta **Expediente del postulante** muestra el contenedor lógico, los identificadores, la oferta vinculada, la familia y el estado. Consulta `GET /api/solicitudes/{id}/carpeta` con JWT. Este endpoint conserva `carpeta` y `archivos` y añade metadatos del expediente y la disponibilidad de CV, informe y pauta. Los botones usan las rutas privadas de descarga. Si un documento falta, la tarjeta muestra **No disponible**.

En el detalle de la solicitud, sobre **Subir informe de entrevista**, el analista, el administrador o el evaluador asignado puede pulsar **Descargar pauta de entrevista**. La pantalla indica la familia de cargo. `GET /api/solicitudes/{id}/pauta-entrevista` requiere Bearer JWT, verifica el acceso a esa solicitud y descarga el DOCX maestro de la familia desde `backend/plantillas/`. Las pautas están versionadas con el backend y la descarga funciona sin las copias locales de candidatos. Ante una familia sin pauta disponible, el servicio responde 404 y la carga sigue habilitada.

1. Abre la solicitud y descarga la pauta específica de su familia.
2. Durante o después de la entrevista, registra respuestas, ejemplos observables y observaciones. Guarda el documento completado en Word.
3. Súbelo como DOC o DOCX de hasta 5 MB mediante **Subir informe de entrevista**. El adjunto queda privado en MongoDB.
4. Como evaluador asignado o administrador, usa **Generar evaluación con IA** con el CV y el informe. Revisa el apoyo generado y registra las decisiones de forma manual.

## Guion de presentación

1. Entra como analista o admin. En **Gestionar ofertas** crea un cargo ficticio o precarga **Analista de Operaciones**, revisa su objetivo y perfil, y guarda el borrador. Verifica que aún no figure en el portal público.
2. Publica la oferta. Abre **Ofertas laborales** en una ventana privada, busca por cargo o palabra clave, filtra por familia, área, región o modalidad y elige **Ver oferta**. Muestra la misión, las funciones y los requisitos de la ficha.
3. Pulsa **Postular**. Usa el nombre **Camila Ficticia**, `camila@example.invalid`, `+56 9 0000 0000` y un PDF o DOCX inventado. Envía el formulario.
4. Vuelve al **Panel** como analista. Abre la solicitud nueva en **Pendiente** y muestra el contenedor lógico en **Expediente del postulante**. Descarga el CV y la pauta desde la tarjeta. Cuando el informe esté cargado, vuelve a la tarjeta para mostrar su descarga.
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
