# Cobertura de testing del frontend

Documento de las pruebas unitarias del frontend (React 19 + Vite + Bootstrap 5) hechas con **Vitest**.
Los números son los de la última ejecución real de `npm run test:cobertura` en la rama
`feature/bootstrap-layouts` (29 de octubre de 2026): **262 pruebas en 20 archivos, 262 aprobadas,
0 fallidas**, sin advertencias de React (`act`) en la salida.

| Ronda | Pruebas | Sentencias | Ramas | Funciones | Líneas |
| ----- | ------: | ---------: | ----: | --------: | -----: |
| 1.ª (5 oct 2026) | 41 | 42,22 % | 32,91 % | 36,00 % | 44,13 % |
| 2.ª (6 oct 2026) | 118 | 94,94 % | 88,19 % | 95,33 % | 95,86 % |
| Rama IA, antes de probar la IA (9 oct 2026) | 129 | 88,96 % | 79,79 % | 88,95 % | 89,69 % |
| 3.ª, rama IA (9 oct 2026) | 163 | 96,07 % | 88,66 % | 96,84 % | 96,85 % |
| 4.ª, migración a Vitest (28 oct 2026, cobertura v8) | 163 | 96,07 % | 88,88 % | 96,84 % | 96,85 % |
| 5.ª, migración a Bootstrap (29 oct 2026) | 262 | **96,95 %** | **90,28 %** | **98,70 %** | **97,73 %** |

La diferencia de ramas entre la 3.ª y la 4.ª ronda viene del cambio de herramienta de cobertura
(Istanbul a V8), no de las pruebas.

## 1. Herramientas y versiones

| Herramienta | Versión | Para qué se usa |
| ----------- | ------- | --------------- |
| Vitest | 5.0.5 | Framework y ejecutor de pruebas: `describe`, `it`, `expect` y mocks (`vi.fn`, `vi.spyOn`). Comparte la configuración de Vite 8, así que entiende JSX sin plugins extra. |
| `@vitest/coverage-v8` | 5.0.5 | Mide la cobertura con el motor V8 (texto, HTML y JSON). Debe tener la misma versión que Vitest. |
| jsdom | 30.1.3 | Simula el navegador (DOM) dentro de Node, donde corren las pruebas. |
| `@testing-library/react` (+ `@testing-library/dom`) | 16.3.3 (+ 10.4.2) | Renderiza componentes y los busca como lo haría un usuario (por texto, rol o etiqueta). |
| React / React Router | 19.2.8 / 7 | Lo que se prueba; `MemoryRouter` para las pantallas con rutas. |
| Node.js | 24 | Donde corren las pruebas (Vitest 5 y jsdom 30 piden Node 22.12 o superior). |

**Por qué estas versiones:** el proyecto usa Vite 8 y Vitest 5 declara soporte para Vite 6, 7 y 8.
`@vitest/coverage-v8` se fija en la misma versión que Vitest porque deben coincidir. jsdom 30 es
la última y es compatible con Node 24. Testing Library ya estaba en el proyecto y se mantuvo.

**Configuración:** está en la sección `test` de `frontend/vite.config.js`: entorno `jsdom`,
globales (`describe`, `it`, `expect`, `vi`) activadas, orden aleatorio, `restoreMocks` (cada prueba
parte con los spies originales restaurados) y cobertura `v8` sobre `src/**/*.{js,jsx}`, excluyendo
`src/pruebas/`, `main.jsx` y archivos de configuración. Los reportes se escriben en
`frontend/coverage/`.

## 2. Cómo ejecutar

Desde `frontend/`:

```bash
npm install                 # una vez
npm test                    # una sola ejecución (vitest run)
npm run test:cobertura      # igual, más el reporte de cobertura (vitest run --coverage)
```

- `silent: false` en la configuración: Vitest 5 oculta lo que las pruebas escriben en la consola
  mientras pasan, y con eso se esconderían advertencias de React como `not wrapped in act(...)`.
  Con la opción desactivada se ven en `npm test`. Se comprobó provocando una a propósito.
- El resultado aparece en la terminal (`Tests  262 passed (262)`).
- El reporte navegable queda en `frontend/coverage/index.html`; el resumen en
  `frontend/coverage/coverage-summary.json`. La carpeta `coverage/` no se versiona.
- Las pruebas corren en **orden aleatorio** (`sequence.shuffle`) para detectar pruebas que dependan
  unas de otras. En la segunda ronda se corrió la suite **8 veces seguidas** y siempre pasaron
  las 118, sin advertencias en la consola. En la tercera, 3 corridas seguidas: siempre 163/163.

## 3. Organización

- Las pruebas están en `frontend/src/pruebas/*.spec.jsx` (con JSX adentro, por eso
  terminan en `.jsx`); las utilidades compartidas están en `ayudantes.jsx`.
- Cada prueba sigue el patrón **Arrange – Act – Assert** (preparar, actuar, comprobar).
- `ayudantes.jsx` reúne utilidades: simular una sesión, renderizar con router y `AuthProvider`,
  simular varias rutas `GET` a la vez (`simularGet`), crear errores con forma de axios, crear
  archivos de prueba, elegir un archivo en un input y esperar una condición (`esperarQue`).

## 4. Pruebas por componente

| Archivo de pruebas | Qué se prueba | N.º | Qué verifica |
| ------------------ | ------------- | :-: | ------------ |
| `fechas.spec.jsx` | `utils/fechas.js` | 4 | `2026-10-05T00:00:00Z` se muestra `05-10-2026` (no un día antes); sin fecha muestra `-`; `hoyLocal()` usa el día local aunque en UTC ya sea el siguiente (reloj simulado); formato `AAAA-MM-DD`. |
| `componentes-simples.spec.jsx` | `EtiquetaPostulacionPublica`, `SelectorCv` | 6 | Texto de la etiqueta y `esPostulacionPublica`; el selector muestra formatos, entrega el archivo al padre (spy), muestra su nombre y acepta otros formatos (informe Word). |
| `autenticacion.spec.jsx` | `Login`, `RutaProtegida`, `Navbar` (privado) | 11 | Login: llama al servicio con los datos y guarda la sesión; error 401 con mensaje; enlace "Postula aquí". Ruta protegida: sin sesión → login; con sesión → contenido; rol no permitido → inicio; rol permitido → contenido. Navbar: enlaces sin sesión, de analista y de evaluador; cerrar sesión. |
| `registro-dashboard.spec.jsx` | `Registro` | 17 | Formulario con analista por defecto; el selector **no ofrece admin** (solo `analista` y `evaluador`); contraseña obligatoria con `minlength=6`; no envía con campos vacíos ni con correo mal escrito; envía nombre, correo, contraseña y rol, guarda la sesión y va al inicio; error 409 del servidor; mensaje genérico si no hay mensaje. |
| | `Dashboard` | 9 | Cuatro tarjetas con los totales; ceros cuando no hay datos; "Cargando…"; error del backend sin tarjetas; mensaje genérico. |
| `api-interceptores.spec.jsx` | Interceptores de `services/api.js` | 7 | Agrega `Authorization: Bearer <token>` y la URL base; sin sesión no agrega cabecera; un 401 en ruta privada avisa al manejador y propaga el error; un 401 en `/auth/login` o `/postulaciones` no cierra sesión; un 500 tampoco; **integrado con `AuthProvider`**: ante un 401 borra la sesión y lleva al login con "Tu sesión expiró, vuelve a iniciar sesión". |
| `servicios.spec.jsx` | `authService`, `solicitudService`, `evaluacionService`, `dashboardService`, `familiaService`, `usuarioService` | 19 | Cada función llama al **método y endpoint correctos con los datos correctos** (incluido el `FormData` de solicitudes con y sin CV, el campo `informe`, el filtro `?rol=`) y devuelve la respuesta; los errores del servidor se propagan. |
| `solicitud-formulario.spec.jsx` | `SolicitudFormulario`, `NuevaSolicitud` | 16 | Carga familias y evaluadores y preselecciona; valida el teléfono chileno; envía `FormData` completo con CV; error del servidor; avisos sin familias/evaluadores; error de carga. Edición: precarga datos, exige elegir evaluador, muestra el CV actual, `PUT` con el evaluador, Cancelar. NuevaSolicitud lleva al panel tras crear. |
| `solicitud-detalle.spec.jsx` | `SolicitudDetalle` | 25 | Datos de la solicitud; "Archivos del candidato" con CV descargable e informe antiguo como **"Archivo no disponible"**; fecha de evaluación correcta; estados vacíos; error de carga. **Botones por rol**: analista (reasigna y sube informe, sin evaluaciones), evaluador responsable (evaluaciones e informe, sin reasignar), **evaluador ajeno (solo mirar; no ve "Subir informe")**, admin (todo). Crear, cancelar y editar evaluaciones (con errores). Informe: rechaza no-Word y > 5 MB, sube con `PUT` y lo muestra, error del servidor. Asignar/cambiar evaluador desde el modal y cancelar. **IA por rol**: evaluador responsable y admin ven "Generar borrador con IA" y "Generar evaluación con IA" con el aviso; analista y evaluador ajeno no; sin informe Word la evaluación queda deshabilitada y con CV + informe se habilita. |
| `postular.spec.jsx` | `Postular` (formulario público) | 17 | Carga las áreas; teléfono chileno inválido y válido; CV de más de 5 MB y de tipo no permitido; envío con `FormData` y "Postulación recibida"; error 409; error al cargar áreas. |
| `archivo-descargable.spec.jsx` | `ArchivoDescargable` + `archivoService` | 4 | "Archivo no disponible" y "Sin archivo"; descarga con sesión (`GET /archivos/:id`, `responseType: "blob"`, nombre UTF-8); error que llega como Blob. |
| `panel.spec.jsx` | `Panel` (Kanban) | 15 | Columnas; "Asignar evaluador" en vez de mover cuando no hay evaluador; mover a En proceso (`PATCH`); "Marcar finalizada"; error al mover (la tarjeta no se mueve); error y "Cargando…" al cargar; Eliminar solo admin; el evaluador sin botones; **eliminar** con confirmación, sin confirmar y con error; asignar evaluador desde la tarjeta (la tarjeta se actualiza) y cancelar. |
| `campo-password.spec.jsx` | `CampoPassword` (dentro de `Login` y `Registro`) | 11 | Parte oculto; mostrar y volver a ocultar sin perder el valor; entrega lo escrito al padre (spy); el botón no envía el formulario; respeta etiqueta, `autoComplete`, `minLength` y `required`; ids únicos. En Login y Registro: `autoComplete` correcto, `minLength=6` se mantiene al mostrar y el envío lleva la contraseña escrita aunque esté visible. |
| `informe-psicolaboral.spec.jsx` | `InformePsicolaboral` (borrador de informe con IA) | 13 | "Cargando informe…"; aviso de IA; botón deshabilitado sin apuntes; incluye la tarjeta de evaluación; solo lectura sin botones para quien no edita; carga de un informe guardado; estado de carga y borrador por secciones; **429 con mensaje amable sin perder los apuntes**; error del servidor; envía los apuntes a la evaluación; guarda las secciones editadas; error al guardar. |
| `evaluacion-ia.spec.jsx` | `EvaluacionIa` (evaluación con nota) | 15 | Aviso "Apoyo generado por IA; la decisión final es del evaluador"; nota grande, competencias con barra (`progressbar`) y justificación, "Sin evidencia" sin barra, bloques de fortalezas, mejoras y recomendaciones, autoría; sin permiso no hay botón; botón deshabilitado si falta el CV o el Word; estado de carga "Generando… puede tardar hasta 1 minuto"; el borrador **no se guarda** hasta confirmar; avisos de recorte; **429 amable**; errores del servidor y genéricos; descartar; confirmar y guardar (cuerpo enviado) y error al guardar. |
| `modulos.spec.jsx` | Todos los módulos de `src/` | 2 | Prueba de humo: todo carga y exporta funciones; hace que el reporte incluya todos los archivos. |
| `layouts.spec.jsx` | `AppLayout`, `PublicLayout`, `Sidebar`, `NavbarPublico`, rutas de `App` | 22 | Navbar, Sidebar, Footer y contenido (Outlet); el marco se mantiene al navegar; menú móvil con los mismos enlaces que el Sidebar; enlace `active`; enlaces por rol; barra pública según la ruta (en `/postular` solo la marca); 404 con y sin sesión; ruta privada sin sesión redirige al login; el evaluador no entra a Nueva solicitud. |
| `panel-filtros.spec.jsx` | `Panel`: búsqueda, filtros y modal | 22 | Búsqueda por nombre y cargo sin tildes ni mayúsculas; filtros por área, responsable y origen y su combinación; "Limpiar filtros" solo con filtros activos; contadores por columna; "Sin solicitudes"; alerta si nada coincide; mover con filtro activo; las tarjetas no cambian de columna al filtrar; grilla responsiva; modal de editar (abre, Escape, fondo, botón). |
| `filtros-panel.spec.jsx` | `utils/filtrosPanel.js` | 7 | Normalización, `hayFiltrosActivos`, búsqueda por campo (sin mezclar nombre y cargo), filtros y opciones únicas. |
| `evaluacion-ia-marcado.spec.jsx` | `EvaluacionIa` (marcado de Bootstrap) | 13 | Banner `alert-info` junto al borrador; nota con badge; barras `progress` con `aria-valuenow/min/max`; competencia sin evidencia con badge y sin barra (sin repetir el texto); listas con viñetas; spinner y botón deshabilitado al generar y al guardar; alerta de error; confirmar guarda una vez y descartar no guarda. |
| `solicitud-detalle-marcado.spec.jsx` | `SolicitudDetalle` (marcado de Bootstrap) | 16 | Carga y error; encabezado con badge y "Volver al panel"; columnas `col-lg-8` y `col-lg-4`; secciones y controles por rol (analista, evaluador responsable, ajeno y admin); evaluaciones como tarjetas; errores y spinner al guardar; modal de editar. |
| **Total** | | **262** | |

Notas:

- **Validación del teléfono chileno:** la expresión regular no está exportada, así que se prueba
  a través de los formularios que la usan (`/postular` y `SolicitudFormulario`).
- **Contraseña de 6 caracteres en el registro:** el navegador solo aplica `minlength` a lo que la
  persona escribe con el teclado; si el valor lo pone un script, nunca lo marca como "muy
  corto". Por eso la prueba verifica la regla declarada en el campo (`required` y
  `minlength=6`) en vez de simular el bloqueo. El backend además rechaza contraseñas cortas.
- **CampoPassword, informe con IA y evaluación con nota:** existen solo en la rama
  `feature/integracion-ia`, así que sus pruebas existen solo en esa rama; este documento cubre todas las pruebas de la rama actual.

## 5. Mocks usados

En Vitest los mocks se hacen con **spies** (`vi.spyOn`, `vi.fn`): reemplazan una
función real por una falsa que registra cómo la llamaron y devuelve lo que la prueba decide.

| Qué se simula | Cómo | Dónde |
| ------------- | ---- | ----- |
| El backend (axios) | `vi.spyOn(api, "get" / "post" / "put" / "patch" / "delete")` sobre la instancia compartida de axios, con `.mockResolvedValue(...)` o `.mockRejectedValue(...)` (sin valor, `.mockImplementation(() => undefined)`, porque `vi.spyOn` llama a la función real por defecto). `simularGet({ ruta: respuesta })` responde distinto según la ruta; una ruta no declarada responde 404 para que la prueba falle en vez de pasar en silencio. Ninguna prueba sale a la red. | Casi todas |
| La capa HTTP de axios (para los interceptores) | Un **adapter falso** pasado en la configuración de la petición (`api.get(url, { adapter })`). La petición recorre los interceptores reales y el adapter recibe la configuración final (con la cabecera ya agregada) o responde un `AxiosError` 401/500. | api-interceptores |
| El manejador de sesión expirada | `vi.fn()` registrado con `registrarManejadorNoAutorizado`. | api-interceptores |
| La sesión / contexto de autenticación | `AuthProvider` real con `token` y `usuario` en `localStorage`. | Navbar, RutaProtegida, Panel, Login, Registro, SolicitudDetalle |
| Las rutas | `MemoryRouter` con pantallas de destino de prueba para comprobar redirecciones. | Varias |
| Callbacks de componentes | `vi.fn()` (`onChange`, `alGuardar`, `alCancelar`). | SelectorCv, SolicitudFormulario |
| La confirmación del navegador | `vi.spyOn(window, "confirm").mockReturnValue(true / false)`. | Panel (eliminar) |
| APIs del navegador para descargar | `vi.spyOn(URL, "createObjectURL")`, `vi.spyOn(URL, "revokeObjectURL")`, `vi.spyOn(HTMLAnchorElement.prototype, "click")`. | ArchivoDescargable |
| El reloj | `vi.useFakeTimers()` + `vi.setSystemTime(...)`. | fechas |
| Una respuesta lenta de la IA | `vi.spyOn(api, "post").mockReturnValue(new Promise(...))`: la promesa queda pendiente para comprobar el estado de carga y luego la prueba la resuelve. Ninguna prueba llama a Gemini. | evaluacion-ia, informe-psicolaboral |
| Cuota agotada de la IA | `errorAxios(429, ...)`. | evaluacion-ia, informe-psicolaboral |

**Por qué se espía la instancia de axios y no los servicios:** los servicios son módulos ES y
sus exportaciones no se pueden reemplazar desde afuera; `api` es un objeto, así que
`vi.spyOn(api, "post")` sí funciona, y además se prueba el servicio real.

## 6. Resultados

Salida de `npm run test:cobertura` (5.ª ronda, rama `feature/bootstrap-layouts`):

```
 Test Files  20 passed (20)
      Tests  262 passed (262)

Statements   : 96.95% ( 701/723 )
Branches     : 90.28% ( 511/566 )
Functions    : 98.7% ( 228/231 )
Lines        : 97.73% ( 646/661 )
```

### Cobertura por archivo

| Archivo | Sentencias | Ramas | Funciones | Líneas |
| ------- | ---------: | ----: | --------: | -----: |
| **Total** | 96,95 % | 90,28 % | 98,70 % | 97,73 % |
| `src/App.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/ArchivoDescargable.jsx` | 100,00 % | 93,75 % | 100,00 % | 100,00 % |
| `src/components/CampoArchivo.jsx` | 100,00 % | 90,90 % | 100,00 % | 100,00 % |
| `src/components/CampoPassword.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/EtiquetaPostulacionPublica.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/EvaluacionIa.jsx` | 100,00 % | 95,23 % | 100,00 % | 100,00 % |
| `src/components/FiltrosPanel.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/Footer.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/InformePsicolaboral.jsx` | 100,00 % | 82,75 % | 100,00 % | 100,00 % |
| `src/components/Modal.jsx` | 100,00 % | 75,00 % | 100,00 % | 100,00 % |
| `src/components/Navbar.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/NavbarPublico.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/RutaProtegida.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/SelectorCv.jsx` | 100,00 % | 87,50 % | 100,00 % | 100,00 % |
| `src/components/Sidebar.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/SolicitudFormulario.jsx` | 96,55 % | 97,22 % | 100,00 % | 96,15 % |
| `src/context/AuthContext.jsx` | 97,22 % | 75,00 % | 100,00 % | 97,22 % |
| `src/hooks/useValidacionFormulario.js` | 85,71 % | 80,00 % | 100,00 % | 87,50 % |
| `src/layouts/AppLayout.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/layouts/PublicLayout.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/layouts/enlaces.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/Dashboard.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/Login.jsx` | 100,00 % | 83,33 % | 100,00 % | 100,00 % |
| `src/pages/NotFoundPage.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/NuevaSolicitud.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/Panel.jsx` | 100,00 % | 93,18 % | 100,00 % | 100,00 % |
| `src/pages/Postular.jsx` | 90,76 % | 91,11 % | 92,85 % | 91,37 % |
| `src/pages/Registro.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/SolicitudDetalle.jsx` | 96,29 % | 87,87 % | 96,96 % | 98,94 % |
| `src/services/api.js` | 100,00 % | 81,81 % | 100,00 % | 100,00 % |
| `src/services/archivoService.js` | 76,00 % | 40,00 % | 75,00 % | 82,60 % |
| `src/services/authService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/dashboardService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/evaluacionService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/familiaService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/informeService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/postulacionService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/solicitudService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/usuarioService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/utils/fechas.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/utils/filtrosPanel.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/utils/mensajeErrorIa.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |

### Análisis

- La meta de la segunda ronda (65 % de líneas y 50 % de ramas) se superó: **95,86 % de líneas y
  88,19 % de ramas**. El salto viene de pantallas que antes no tenían pruebas
  (`SolicitudDetalle`, `SolicitudFormulario`, `Registro`, `Dashboard`), de los servicios y de
  los interceptores.
- La cobertura no se "infló": no hay pruebas vacías ni pruebas que solo ejecuten código. Cada
  prueba tiene comprobaciones sobre lo que ve el usuario o sobre lo que se envía al backend.
  Para confirmarlo se hicieron **verificaciones de mutación**: se introdujo a propósito un error
  en la app, se corrió la suite y se restauró el archivo.

| Error introducido a propósito | Resultado | Prueba que lo detectó |
| ----------------------------- | --------- | --------------------- |
| El Kanban deja mover una solicitud sin evaluador (1.ª ronda) | 1 FAILED | "sin evaluador muestra 'Asignar evaluador'…" |
| `api.js` deja de agregar el token | 1 FAILED, 117 SUCCESS | "agrega el token guardado en la cabecera Authorization" |
| El registro ofrece el rol admin | 1 FAILED, 117 SUCCESS | "el selector de rol NO ofrece admin" |
| Cualquier usuario puede subir el informe | 1 FAILED, 117 SUCCESS | "evaluador ajeno: solo puede mirar…" |

- **3.ª ronda (rama IA):** al mezclar `main` la cobertura de la rama había bajado a 89,69 % de
  líneas, porque `InformePsicolaboral.jsx` (41,5 %) e `informeService.js` (16,7 %) no tenían
  pruebas. Con las 34 pruebas nuevas de la IA quedan en 100 % de líneas, y el total sube a
  **96,85 % de líneas y 88,66 % de ramas**.
- **4.ª ronda (Vitest):** se migraron las 163 pruebas sin quitar ninguna. La cobertura de líneas,
  sentencias y funciones es idéntica a la de la ronda anterior; las ramas pasan de 88,66 % a 88,88 % solo
  porque la herramienta de cobertura (V8) cuenta las ramas de forma distinta a la anterior. Se repitió la verificación de mutación
  con tres errores nuevos y Vitest detectó los tres:

| Error introducido a propósito (4.ª ronda) | Resultado | Prueba que lo detectó |
| ----------------------------------------- | --------- | --------------------- |
| `Postular.jsx` acepta CV de hasta ~95 MB en vez de 5 MB | 1 failed, 162 passed | "rechaza un archivo de más de 5 MB" |
| `api.js` reacciona a un 403 en vez de un 401 | 2 failed, 161 passed | interceptores: "ante un 401 en una ruta privada…" y la integración con `AuthProvider` |
| `hoyLocal()` entrega el mes anterior (sin el `+ 1`) | 2 failed, 161 passed | `fechas`: las dos pruebas de `hoyLocal` |

  Después de cada error se restauró el archivo.
- **5.ª ronda (Bootstrap):** las 163 pruebas anteriores siguen pasando y se suman 99 nuevas (layouts,
  búsqueda y filtros del panel, validación visible de formularios, marcado accesible de la IA y del
  detalle). Casi todas buscan por rol, texto o etiqueta, como antes; las pocas que comprueban clases
  de Bootstrap lo hacen a propósito para verificar el layout (columnas, `modal-lg`, `is-invalid`).
  Se eliminó la rama "sin sesión" del `Navbar` privado (ya no se usaba) y con ella su prueba.
- **Estabilidad:** 8 corridas seguidas en orden aleatorio, siempre 118/118 (2.ª ronda); 3
  corridas seguidas, siempre 163/163 (3.ª ronda). Se eliminaron las
  advertencias `act(...)` de React (venían de la prueba del 401, donde el manejador actualiza el
  estado desde una promesa de axios; ahora esa llamada va dentro de `act`).

## 7. Lo que NO está cubierto y por qué

| Qué | Por qué no |
| --- | ---------- |
| `main.jsx` (fuera del reporte) | Monta la app en el `#root` de `index.html`; no tiene lógica propia. |
| `archivoService.js`: ramas de respaldo (40 % de ramas) | Cuando la cabecera `Content-Disposition` no viene, viene mal codificada o el error no es un Blob. Se cubrió el caso normal y el error típico; los respaldos son defensivos. |
| `Postular.jsx` líneas 51-52 y 56-57; `SolicitudFormulario.jsx` 51-52 | Validaciones repetidas al enviar (teléfono y CV). No se pueden alcanzar desde la interfaz porque el botón ya está deshabilitado con datos inválidos; quedan como segunda defensa. |
| `Postular.jsx` línea 253 | El `onChange` del campo trampa (honeypot) oculto; solo lo llenan bots. El comportamiento del honeypot se verifica en el backend. |
| `SolicitudDetalle.jsx` línea 403 | Cancelar la edición de una evaluación ya creada. Cancelar al crear una nueva sí se prueba. |
| `Panel.jsx` ramas de los mensajes de error | Los mensajes genéricos cuando el error no trae `mensaje` al cargar, mover o eliminar. Se prueba el caso con mensaje del servidor. |
| `hooks/useValidacionFormulario.js` líneas 7-8 | Los mensajes de "texto demasiado corto" y el genérico: jsdom no marca `minLength` en valores puestos por un script, igual que el navegador. Sí se prueban el campo obligatorio y el correo inválido. |
| `Modal.jsx`, `CampoArchivo.jsx`, `SelectorCv.jsx` (ramas) | Alternativas de bajo valor: el cuadro del modal sin pie, y el caso de "ningún archivo" al cancelar el selector. |
| `AuthContext.jsx` línea 61 | El error de usar `useAuth` fuera de un `AuthProvider`: es un aviso para quien programa, no un caso de la app. |
| `Login.jsx` línea 20; `api.js` ramas 3 y 29 | El mensaje genérico de login sin respuesta del servidor; la URL por defecto cuando no hay `VITE_API_URL` (en las pruebas siempre se define) y una petición de error sin `config`. |
| `InformePsicolaboral.jsx` (83 % de ramas) y `EvaluacionIa.jsx` (95 % de ramas) | Respaldos para datos guardados incompletos (`data.secciones || []`, informe sin `modeloIa`), la evaluación guardada sin autor y errores sin mensaje. Son defensivos: el backend siempre guarda esos campos. |
| Apariencia final (colores, espaciados, responsive real) | Las pruebas unitarias verifican comportamiento y las clases de layout, no cómo se ve en pantalla; eso se revisa a ojo en el navegador (escritorio y móvil). |
| Backend | Esta evaluación pide pruebas del frontend; el backend tiene sus propias pruebas con `node --test` (ver el README). |
