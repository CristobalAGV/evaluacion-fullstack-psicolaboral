# Evaluación Psicolaboral — Digitalización del proceso de Reclutamiento y Selección

**Autor:** Cristobal González, estudiante de Duoc UC Puerto Montt.

Aplicación web (MVP) que digitaliza el proceso de **evaluación psicolaboral**
dentro de un flujo de Reclutamiento y Selección. Permite registrar solicitudes
de evaluación para candidatos, asignarles un profesional responsable, seguir su
avance en un tablero Kanban, registrar las evaluaciones asociadas y consultar
indicadores en un dashboard.

Cuando un proceso así se gestiona de forma manual y con la información
repartida en distintos lugares, cuesta saber en qué estado está cada
candidato. Este MVP propone centralizar esa información en un solo lugar.

## Capturas de pantalla

Tomadas con la aplicación corriendo en local y **datos ficticios** de
demostración.

**Dashboard de indicadores**

![Dashboard con el total de candidatos y solicitudes por estado](docs/capturas/dashboard.png)

**Panel Kanban de solicitudes**

![Panel Kanban con columnas Pendiente, En proceso y Finalizada](docs/capturas/panel-kanban.png)

**Formulario de nueva solicitud**

![Formulario para crear una solicitud de evaluación](docs/capturas/nueva-solicitud.png)

**Detalle de solicitud con sus evaluaciones**

![Detalle de una solicitud y su evaluación asociada](docs/capturas/detalle-solicitud.png)

## Contexto académico

- **Asignatura:** Full Stack II — DSY1104
- **Institución:** Duoc UC
- **Tipo de proyecto:** Vinculación con el Medio, en colaboración con **AquaChile**
- **Alcance evaluado:** Caso de la asignatura DSY1104

> ### ⚠️ Aviso sobre los datos
>
> **Todos los datos de esta aplicación son ficticios y fueron creados
> únicamente con fines académicos y de demostración.**
>
> Los candidatos, usuarios, correos, teléfonos, cargos, evaluaciones y archivos
> que aparecen en el sistema **no corresponden a información real de AquaChile,
> ni a personas reales, ni a procesos de selección reales** de la empresa. No se
> utilizó ningún dato personal ni información confidencial de la organización.

## Despliegue

| Parte | URL |
| ----- | --- |
| Frontend (Vercel) | https://evaluacion-fullstack-psicolaboral.vercel.app |
| Backend / API (Render) | https://evaluacion-fullstack-psicolaboral.onrender.com |

> **Nota importante sobre la primera carga.** El backend está en el plan
> gratuito de Render, que **suspende el servicio tras un período de
> inactividad**. Si nadie lo ha usado en un rato, la primera petición debe
> "despertarlo" y puede tardar **hasta ~50 segundos**. Si al entrar la pantalla
> de inicio de sesión parece colgada, espera ese tiempo y reintenta: es el
> arranque en frío, no un error de la aplicación. Las peticiones siguientes
> responden con normalidad.
>
> Para adelantar el arranque puedes abrir primero
> `https://evaluacion-fullstack-psicolaboral.onrender.com/api/health`,
> que responde `{"estado":"ok"}` cuando el backend ya está despierto.

## Estado del avance

Situación al 1 de octubre de 2026, organizada por hitos de entrega.

| Hito | Estado |
| ---- | ------ |
| Hito 1 — Frontend funcional | ✅ Completo |
| Hito 2 — Integración Full Stack | 🟡 En curso (integración funcionando, faltan cierres) |
| Hito 3 — MVP final desplegado | 🟡 En curso (hay una versión desplegada, aún no es la final) |

### Hito 1 — Frontend funcional

**Completo:**

- Vistas de inicio de sesión, registro, dashboard, panel Kanban, nueva
  solicitud, edición y detalle de solicitud, construidas con React, Vite y
  Tailwind.
- Rutas protegidas y navegación con React Router.
- Validaciones de formulario (correo y celular chileno) y mensajes de error.

**Pendiente:**

- La fecha de cada evaluación se muestra un día antes en el detalle (se
  guarda como medianoche UTC y se muestra en la hora local de Chile). Es un
  error de visualización conocido, sin corregir aún.

### Hito 2 — Integración Full Stack

**Completo:**

- El frontend consume la API REST real (Express 5 + MongoDB Atlas) en todas
  sus vistas; no hay datos simulados en la interfaz.
- Autenticación con JWT de punta a punta, incluido el manejo de sesión
  expirada.
- CRUD de solicitudes, cambio de estado, evaluaciones, dashboard calculado en
  el backend, carga de CV y creación automática de la carpeta del candidato
  con sus plantillas.

**Pendiente:**

- **Permisos por rol.** Los tres roles existen y se guardan en el token, pero
  hoy cualquier usuario autenticado puede hacer todas las operaciones: el
  middleware `permitirRoles` está escrito pero no se aplica a ninguna ruta.
- **Registro abierto a cualquier rol.** La pantalla de registro permite
  elegir `admin` sin ninguna restricción.
- **Sin pruebas automatizadas** en backend ni en frontend; la verificación
  ha sido manual.
- Los modelos `Entrevista` e `Informe` siguen sin exponerse en la API (ver
  la nota de alcance en *Modelo de datos*).

### Hito 3 — MVP final desplegado

**Completo:**

- Frontend desplegado en Vercel y backend en Render, conectados a MongoDB
  Atlas (URLs en la sección *Despliegue*).
- Etiqueta `v1.0-mvp` (17 de septiembre de 2026) que congela la versión
  desplegada actual.

**Pendiente:**

- Desplegar la versión final una vez cerrados los pendientes del Hito 2.
- El backend usa el plan gratuito de Render: la primera carga tras un rato
  sin uso puede tardar hasta ~50 segundos.
- Los CV y las carpetas de candidato se guardan en el disco del servidor; en
  Render ese disco no es persistente, así que esos archivos pueden perderse
  al reiniciarse el servicio.

> La integración con IA se trabaja aparte, en la rama
> `feature/integracion-ia`. Es experimental, no forma parte del alcance
> evaluado y no está incluida en `main`.

## Stack tecnológico

**Frontend**

- React 19 con **Vite** como bundler y servidor de desarrollo
- **Tailwind CSS v4** (integrado con el plugin `@tailwindcss/vite`)
- React Router para la navegación entre vistas
- Axios como cliente HTTP, con interceptores para el token y el manejo de sesión

**Backend**

- Node.js con **Express 5** (API REST, ES Modules)
- **MongoDB Atlas** como base de datos, con **Mongoose** como ODM
- **JWT** (`jsonwebtoken`) para autenticación, y `bcryptjs` para el hasheo de contraseñas
- `multer` para la carga de archivos (CV)
- `exceljs` y `docx` para generar las plantillas de informe y pauta de entrevista

## Funcionalidades implementadas

### Autenticación y roles

- Registro e inicio de sesión con JWT; la contraseña se guarda hasheada con bcrypt.
- Tres roles: **`analista`**, **`evaluador`** y **`admin`**.
- Todas las rutas de negocio exigen token válido.
- Rutas protegidas en el frontend: sin sesión, se redirige a inicio de sesión.
- **Manejo de sesión expirada:** si la API responde `401`, la aplicación limpia
  la sesión, redirige al login y avisa "Tu sesión expiró, vuelve a iniciar sesión".

### Gestión de solicitudes (CRUD completo)

- Crear, listar, ver el detalle, editar y eliminar solicitudes de evaluación.
- Cada solicitud registra: candidato, familia de cargo, cargo, observaciones,
  profesional responsable (un usuario con rol `evaluador`) y el analista que la creó.
- Al eliminar una solicitud se borran también su CV y su carpeta de candidato,
  para no dejar archivos huérfanos.

### Gestión de candidatos

- Los datos del candidato (nombre, correo y teléfono) se capturan desde el
  formulario de la solicitud.
- **Validaciones** aplicadas en frontend y backend: formato de correo y formato
  de celular chileno (`+56 9` seguido de 8 dígitos, con espacios opcionales).

### Panel Kanban

- Tablero con tres columnas según el estado de la solicitud:
  **Pendiente → En proceso → Finalizada**.
- Cada tarjeta muestra candidato, cargo, familia de cargo y responsable, y
  permite avanzar de estado, editar o eliminar sin recargar la página.

### Evaluaciones

- Entidad propia asociada a cada solicitud, con fecha, resultado/observaciones
  y su propio estado.
- Se crean, listan y editan desde la vista de detalle de la solicitud.

### Dashboard de indicadores

- Tarjetas con el total de candidatos y el número de solicitudes pendientes,
  en proceso y finalizadas, calculadas en el backend.

### Carga de CV

- Archivo **opcional** en formato PDF, DOC o DOCX, con un límite de **5 MB**.
- El backend rechaza cualquier otro formato o tamaño con un mensaje claro.

### Automatización de carpetas y plantillas

Cada familia de cargo tiene su propia plantilla de informe (`.xlsx`) y pauta de
entrevista (`.docx`), generadas por script en `backend/plantillas/<familia>/`.

Al crear una solicitud, el sistema arma automáticamente la carpeta
`backend/candidatos/<nombre-candidato>-<id-solicitud>/` y copia dentro:

1. El CV del candidato (si se adjuntó).
2. La plantilla de informe de su familia de cargo.
3. La pauta de entrevista de su familia de cargo.

El endpoint `GET /api/solicitudes/:id/carpeta` permite consultar el contenido de
esa carpeta. Si la creación de la carpeta falla, la solicitud se revierte
completa para no dejar registros a medias.

## Modelo de datos

### `Usuario`

| Campo | Tipo | Detalle |
| ----- | ---- | ------- |
| `nombre` | String | Obligatorio |
| `correo` | String | Obligatorio, único |
| `password` | String | Obligatorio, mínimo 6 caracteres, hasheado y oculto en las consultas |
| `rol` | String | `analista` \| `evaluador` \| `admin` (por defecto `analista`) |

### `Candidato`

| Campo | Tipo | Detalle |
| ----- | ---- | ------- |
| `nombre` | String | Obligatorio |
| `correo` | String | Obligatorio, validado como email |
| `telefono` | String | Obligatorio, validado como celular chileno |
| `cvUrl` | String | Ruta del CV, opcional |

### `FamiliaDeCargo`

| Campo | Tipo | Detalle |
| ----- | ---- | ------- |
| `nombre` | String | Obligatorio, único |
| `plantillaInforme` | String | Ruta relativa al `.xlsx` de la plantilla |
| `pautaEntrevista` | String | Ruta relativa al `.docx` de la pauta |

Familias precargadas: Atención al Cliente, Ventas, Administración y Operaciones.

### `Solicitud`

| Campo | Tipo | Detalle |
| ----- | ---- | ------- |
| `candidato` | ObjectId → `Candidato` | Obligatorio |
| `familiaDeCargo` | ObjectId → `FamiliaDeCargo` | Obligatorio |
| `cargo` | String | Obligatorio |
| `cvUrl` | String | Ruta del CV subido |
| `carpetaCandidato` | String | Nombre de la carpeta generada automáticamente |
| `observaciones` | String | Texto libre |
| `profesionalResponsable` | ObjectId → `Usuario` | Obligatorio, debe tener rol `evaluador` |
| `analistaId` | ObjectId → `Usuario` | Obligatorio, quien creó la solicitud |
| `estado` | String | `Pendiente` \| `En proceso` \| `Finalizada` |
| `fecha` | Date | Por defecto, la fecha de creación |

### `Evaluacion`

| Campo | Tipo | Detalle |
| ----- | ---- | ------- |
| `solicitud` | ObjectId → `Solicitud` | Obligatorio |
| `fechaEvaluacion` | Date | Por defecto, la fecha actual |
| `resultado` | String | Resultado u observaciones de la evaluación |
| `estado` | String | `Pendiente` \| `En proceso` \| `Finalizada` |

Todas las entidades incluyen además `createdAt` y `updatedAt` automáticos.

> **Nota de alcance:** el repositorio también contiene los modelos `Entrevista`
> e `Informe`, definidos en una etapa temprana del proyecto. Se mantienen en el
> código pero **no están expuestos por la API ni se usan en la interfaz**: su
> funcionalidad quedó fuera del alcance de este MVP.

## API REST

Base local: `http://localhost:4000` · Base en producción:
`https://evaluacion-fullstack-psicolaboral.onrender.com`

Salvo los endpoints marcados como públicos, **todos requieren** la cabecera:

```
Authorization: Bearer <token>
```

### Salud

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/api/health` | Chequeo de estado. Público. |

### Autenticación — `/api/auth`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `POST` | `/api/auth/registro` | Crea un usuario (`nombre`, `correo`, `password`, `rol`). Devuelve usuario y token. Público. |
| `POST` | `/api/auth/login` | Inicia sesión (`correo`, `password`). Devuelve usuario y token. Público. |
| `GET` | `/api/auth/perfil` | Datos del usuario autenticado. |

### Usuarios — `/api/usuarios`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/api/usuarios` | Lista usuarios. Acepta `?rol=evaluador` para filtrar (lo usa el selector de profesional responsable). |

### Familias de cargo — `/api/familias`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/api/familias` | Lista las familias de cargo disponibles. |

### Solicitudes — `/api/solicitudes`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/api/solicitudes` | Lista todas las solicitudes, con candidato, familia, analista y responsable ya poblados. |
| `POST` | `/api/solicitudes` | Crea una solicitud. **`multipart/form-data`**. |
| `GET` | `/api/solicitudes/:id` | Detalle de una solicitud. |
| `PUT` | `/api/solicitudes/:id` | Edita la solicitud. **`multipart/form-data`**; si se adjunta un CV nuevo, reemplaza el anterior. |
| `DELETE` | `/api/solicitudes/:id` | Elimina la solicitud, su CV y su carpeta de candidato. |
| `PATCH` | `/api/solicitudes/:id/estado` | Cambia el estado (`Pendiente`, `En proceso` o `Finalizada`). |
| `GET` | `/api/solicitudes/:id/carpeta` | Lista los archivos de la carpeta del candidato. |
| `GET` | `/api/solicitudes/:id/evaluaciones` | Lista las evaluaciones de esa solicitud. |
| `POST` | `/api/solicitudes/:id/evaluaciones` | Crea una evaluación asociada a esa solicitud. |

Campos de `POST` y `PUT` de solicitudes: `candidatoNombre`, `candidatoCorreo`,
`candidatoTelefono`, `familiaDeCargo` (id), `cargo`, `profesionalResponsable`
(id de un usuario `evaluador`), `observaciones` (opcional) y `cv` (archivo,
opcional).

### Evaluaciones — `/api/evaluaciones`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `PUT` | `/api/evaluaciones/:id` | Edita una evaluación (`fechaEvaluacion`, `resultado`, `estado`). |

### Dashboard — `/api/dashboard`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/api/dashboard` | Totales: candidatos y solicitudes pendientes, en proceso y finalizadas. |

### Archivos

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/uploads/<archivo>` | Sirve los CV subidos. |

## Instalación y ejecución local

### Requisitos previos

- **Node.js 18 o superior** y npm
- Una base de datos MongoDB: una instancia local o una gratuita en **MongoDB Atlas**

> Si usas MongoDB Atlas, recuerda agregar tu IP en **Network Access**; de lo
> contrario la conexión será rechazada.

### 1. Clonar el repositorio

```bash
git clone https://github.com/CristobalAGV/evaluacion-fullstack-psicolaboral.git
cd evaluacion-fullstack-psicolaboral
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # luego edita el .env con tus valores
npm run dev             # queda escuchando en http://localhost:4000
```

Variables de entorno (`backend/.env`):

| Variable | Para qué sirve |
| -------- | -------------- |
| `PORT` | Puerto donde escucha la API. Por defecto `4000`. En Render lo asigna la plataforma. |
| `MONGO_URI` | Cadena de conexión a MongoDB (local o Atlas), incluyendo el nombre de la base de datos. |
| `JWT_SECRET` | Texto secreto con el que se firman los tokens. Debe ser largo y distinto en producción. |
| `JWT_EXPIRES_IN` | Duración del token, por ejemplo `1d`. Si se omite, se usa `1d`. |
| `CORS_ORIGIN` | Origen(es) autorizados a consumir la API. Acepta varios separados por coma. |

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env    # ajusta la URL si tu backend no está en el puerto 4000
npm run dev             # queda disponible en http://localhost:5173
```

Variables de entorno (`frontend/.env`):

| Variable | Para qué sirve |
| -------- | -------------- |
| `VITE_API_URL` | URL base de la API, **incluyendo el sufijo `/api`**. En local: `http://localhost:4000/api`. |

### 4. Cargar los datos iniciales

Con el backend configurado, carga las familias de cargo y genera las plantillas:

```bash
cd backend
npm run generar-plantillas
npm run seed
```

### 5. Usar la aplicación

Abre `http://localhost:5173`, crea una cuenta y entra.

> Para crear una solicitud debe existir **al menos un usuario con rol
> `evaluador`**, porque toda solicitud necesita un profesional responsable.
> Registra uno desde la pantalla de registro eligiendo ese rol.

## Scripts disponibles

### Backend (`cd backend`)

| Script | Qué hace | Cuándo usarlo |
| ------ | -------- | ------------- |
| `npm run dev` | Levanta la API con nodemon (se reinicia al guardar cambios). | Durante el desarrollo. |
| `npm start` | Levanta la API sin nodemon. | En producción (es el que usa Render). |
| `npm run generar-plantillas` | Genera los archivos `plantilla_informe.xlsx` y `pauta_entrevista.docx` de cada familia en `backend/plantillas/`. | Una vez al preparar el proyecto, o si quieres regenerar las plantillas tras modificar el script. |
| `npm run seed` | Crea (o actualiza) las cuatro familias de cargo en la base de datos. | Al montar el proyecto en una base nueva. Es idempotente: ejecutarlo varias veces no duplica nada. |
| `npm run migrar-familias` | Corrige los nombres de familias guardados sin tilde (`Administracion` → `Administración`), actualizando cada documento **por su `_id`** para no romper las solicitudes que las referencian. | Solo en bases creadas antes de esa corrección. Es idempotente y seguro de repetir. |

### Frontend (`cd frontend`)

| Script | Qué hace |
| ------ | -------- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Compila la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente lo que generó `build`, para revisarlo antes de desplegar. |
| `npm run lint` | Revisa el código con oxlint. |

## Estructura del repositorio

```
backend/
  src/
    config/       Conexión a MongoDB
    models/       Esquemas de Mongoose
    controllers/  Lógica de cada recurso
    routes/       Definición de los endpoints
    middleware/   Autenticación JWT y carga de archivos (multer)
    utils/        Creación de carpetas de candidato y copia de plantillas
    seed/         Scripts de datos iniciales, migración y plantillas
  plantillas/     Plantillas .xlsx y .docx por familia de cargo
  candidatos/     Carpetas generadas automáticamente (no versionadas)
  uploads/        CV subidos (no versionados)

frontend/
  src/
    components/   Componentes reutilizables (Navbar, formulario, ruta protegida)
    pages/        Vistas (Inicio, Panel, Nueva solicitud, Detalle, Login, Registro)
    services/     Cliente axios y llamadas a la API
    context/      AuthContext: sesión, token y manejo de expiración
```

## Ramas del proyecto

| Rama | Para qué sirve |
| ---- | -------------- |
| `main` | La versión oficial, la que se entrega y se despliega. **No experimentar aquí.** |
| `feature/integracion-ia` | Espacio para probar la integración de IA, que no es parte del alcance evaluado. |

Además existe el tag `v1.0-mvp`, que marca el MVP terminado para poder volver a él si algo se rompe más adelante.

Para ver, cambiar y subir ramas, o volver al tag, consulta la [guía rápida de git](docs/guia-git.md).
