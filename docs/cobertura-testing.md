# Cobertura de testing del frontend

Documento de las pruebas unitarias del frontend (React 19 + Vite) hechas con **Jasmine** y
**Karma**. Los números son los de la última ejecución real de `npm run test:cobertura` en la
rama `feature/integracion-ia` (9 de octubre de 2026): **163 pruebas, 163 aprobadas, 0 fallidas**.
Son las 118 de `main` más 45 de lo propio de esta rama (campo de contraseña, informe con IA y
evaluación con nota).

| Ronda | Pruebas | Sentencias | Ramas | Funciones | Líneas |
| ----- | ------: | ---------: | ----: | --------: | -----: |
| 1.ª (5 oct 2026) | 41 | 42,22 % | 32,91 % | 36,00 % | 44,13 % |
| 2.ª (6 oct 2026) | 118 | 94,94 % | 88,19 % | 95,33 % | 95,86 % |
| Rama IA, antes de probar la IA (9 oct 2026) | 129 | 88,96 % | 79,79 % | 88,95 % | 89,69 % |
| 3.ª, rama IA (9 oct 2026) | 163 | **96,07 %** | **88,66 %** | **96,84 %** | **96,85 %** |

## 1. Herramientas y versiones

| Herramienta | Versión | Para qué se usa |
| ----------- | ------- | --------------- |
| Jasmine (`jasmine-core`) | 4.6.1 | Framework de pruebas: `describe`, `it`, `expect` y spies (mocks). |
| Karma | 6.4.4 | Ejecuta las pruebas en un navegador real y muestra los resultados. |
| `karma-jasmine` | 5.1.0 | Conecta Karma con Jasmine. |
| `karma-chrome-launcher` | 3.2.0 | Abre Chrome sin interfaz (**ChromeHeadless**). |
| `karma-esbuild` + `esbuild` | 2.3.0 + 0.28.2 | Compila JSX y módulos ES al vuelo para el navegador. |
| `karma-coverage` | 2.2.1 | Genera el reporte de cobertura (texto, HTML y JSON). |
| `istanbul-lib-instrument` | 6.0.3 | Instrumenta el código para medir qué líneas se ejecutan. |
| `@testing-library/react` (+ `@testing-library/dom`) | 16.3.3 (+ 10.4.2) | Renderiza componentes y los busca como lo haría un usuario (por texto, rol o etiqueta). |
| React / React Router | 19.2.8 / 7 | Lo que se prueba; `MemoryRouter` para las pantallas con rutas. |
| Navegador | Chrome 154 (Windows) | Donde corren las pruebas. |

**Por qué `karma-esbuild` y no `karma-vite`:** `karma-vite` solo soporta Vite 2 a 5 y este
proyecto usa Vite 8. `karma-esbuild` compila JSX y ESM directamente y no depende de Vite.

**Cómo se mide la cobertura:** en `karma.conf.cjs` hay un plugin chico de esbuild que, solo al
correr `test:cobertura`, pasa cada archivo de `src/` (menos las pruebas) por
`istanbul-lib-instrument`. `karma-coverage` recoge el resultado del navegador y escribe los
reportes en `frontend/coverage/`.

## 2. Cómo ejecutar

Desde `frontend/`, con Chrome instalado:

```bash
npm install                 # una vez
npm test                    # una sola ejecución en ChromeHeadless
npm run test:cobertura      # igual, más el reporte de cobertura
```

- El resultado aparece en la terminal (`TOTAL: 163 SUCCESS`).
- El reporte navegable queda en `frontend/coverage/html/index.html`; el resumen en
  `frontend/coverage/coverage-summary.json`. La carpeta `coverage/` no se versiona.
- Las pruebas corren en **orden aleatorio** (`random: true`) para detectar pruebas que dependan
  unas de otras. En la segunda ronda se corrió la suite **8 veces seguidas** y siempre pasaron
  las 118, sin advertencias en la consola. En la tercera, 3 corridas seguidas: siempre 163/163.

## 3. Organización

- Las pruebas están en `frontend/src/pruebas/*.spec.js` (con JSX adentro; `karma-esbuild` exige
  extensión `.js` en los archivos de entrada de prueba).
- Cada prueba sigue el patrón **Arrange – Act – Assert** (preparar, actuar, comprobar).
- `ayudantes.js` reúne utilidades: simular una sesión, renderizar con router y `AuthProvider`,
  simular varias rutas `GET` a la vez (`simularGet`), crear errores con forma de axios, crear
  archivos de prueba, elegir un archivo en un input y esperar una condición (`esperarQue`).

## 4. Pruebas por componente

| Archivo de pruebas | Qué se prueba | N.º | Qué verifica |
| ------------------ | ------------- | :-: | ------------ |
| `fechas.spec.js` | `utils/fechas.js` | 4 | `2026-10-05T00:00:00Z` se muestra `05-10-2026` (no un día antes); sin fecha muestra `-`; `hoyLocal()` usa el día local aunque en UTC ya sea el siguiente (reloj simulado); formato `AAAA-MM-DD`. |
| `componentes-simples.spec.js` | `EtiquetaPostulacionPublica`, `SelectorCv` | 6 | Texto de la etiqueta y `esPostulacionPublica`; el selector muestra formatos, entrega el archivo al padre (spy), muestra su nombre y acepta otros formatos (informe Word). |
| `autenticacion.spec.js` | `Login`, `RutaProtegida`, `Navbar` | 11 | Login: llama al servicio con los datos y guarda la sesión; error 401 con mensaje; enlace "Postula aquí". Ruta protegida: sin sesión → login; con sesión → contenido; rol no permitido → inicio; rol permitido → contenido. Navbar: enlaces sin sesión, de analista y de evaluador; cerrar sesión. |
| `registro-dashboard.spec.js` | `Registro` | 8 | Formulario con analista por defecto; el selector **no ofrece admin** (solo `analista` y `evaluador`); contraseña obligatoria con `minlength=6`; no envía con campos vacíos ni con correo mal escrito; envía nombre, correo, contraseña y rol, guarda la sesión y va al inicio; error 409 del servidor; mensaje genérico si no hay mensaje. |
| | `Dashboard` | 5 | Cuatro tarjetas con los totales; ceros cuando no hay datos; "Cargando…"; error del backend sin tarjetas; mensaje genérico. |
| `api-interceptores.spec.js` | Interceptores de `services/api.js` | 7 | Agrega `Authorization: Bearer <token>` y la URL base; sin sesión no agrega cabecera; un 401 en ruta privada avisa al manejador y propaga el error; un 401 en `/auth/login` o `/postulaciones` no cierra sesión; un 500 tampoco; **integrado con `AuthProvider`**: ante un 401 borra la sesión y lleva al login con "Tu sesión expiró, vuelve a iniciar sesión". |
| `servicios.spec.js` | `authService`, `solicitudService`, `evaluacionService`, `dashboardService`, `familiaService`, `usuarioService` | 19 | Cada función llama al **método y endpoint correctos con los datos correctos** (incluido el `FormData` de solicitudes con y sin CV, el campo `informe`, el filtro `?rol=`) y devuelve la respuesta; los errores del servidor se propagan. |
| `solicitud-formulario.spec.js` | `SolicitudFormulario`, `NuevaSolicitud` | 10 | Carga familias y evaluadores y preselecciona; valida el teléfono chileno; envía `FormData` completo con CV; error del servidor; avisos sin familias/evaluadores; error de carga. Edición: precarga datos, exige elegir evaluador, muestra el CV actual, `PUT` con el evaluador, Cancelar. NuevaSolicitud lleva al panel tras crear. |
| `solicitud-detalle.spec.js` | `SolicitudDetalle` | 25 | Datos de la solicitud; "Archivos del candidato" con CV descargable e informe antiguo como **"Archivo no disponible"**; fecha de evaluación correcta; estados vacíos; error de carga. **Botones por rol**: analista (reasigna y sube informe, sin evaluaciones), evaluador responsable (evaluaciones e informe, sin reasignar), **evaluador ajeno (solo mirar; no ve "Subir informe")**, admin (todo). Crear, cancelar y editar evaluaciones (con errores). Informe: rechaza no-Word y > 5 MB, sube con `PUT` y lo muestra, error del servidor. Asignar/cambiar evaluador desde el modal y cancelar. **IA por rol**: evaluador responsable y admin ven "Generar borrador con IA" y "Generar evaluación con IA" con el aviso; analista y evaluador ajeno no; sin informe Word la evaluación queda deshabilitada y con CV + informe se habilita. |
| `postular.spec.js` | `Postular` (formulario público) | 8 | Carga las áreas; teléfono chileno inválido y válido; CV de más de 5 MB y de tipo no permitido; envío con `FormData` y "Postulación recibida"; error 409; error al cargar áreas. |
| `archivo-descargable.spec.js` | `ArchivoDescargable` + `archivoService` | 4 | "Archivo no disponible" y "Sin archivo"; descarga con sesión (`GET /archivos/:id`, `responseType: "blob"`, nombre UTF-8); error que llega como Blob. |
| `panel.spec.js` | `Panel` (Kanban) | 15 | Columnas; "Asignar evaluador" en vez de mover cuando no hay evaluador; mover a En proceso (`PATCH`); "Marcar finalizada"; error al mover (la tarjeta no se mueve); error y "Cargando…" al cargar; Eliminar solo admin; el evaluador sin botones; **eliminar** con confirmación, sin confirmar y con error; asignar evaluador desde la tarjeta (la tarjeta se actualiza) y cancelar. |
| `campo-password.spec.js` | `CampoPassword` (dentro de `Login` y `Registro`) | 11 | Parte oculto; mostrar y volver a ocultar sin perder el valor; entrega lo escrito al padre (spy); el botón no envía el formulario; respeta etiqueta, `autoComplete`, `minLength` y `required`; ids únicos. En Login y Registro: `autoComplete` correcto, `minLength=6` se mantiene al mostrar y el envío lleva la contraseña escrita aunque esté visible. |
| `informe-psicolaboral.spec.js` | `InformePsicolaboral` (borrador de informe con IA) | 13 | "Cargando informe…"; aviso de IA; botón deshabilitado sin apuntes; incluye la tarjeta de evaluación; solo lectura sin botones para quien no edita; carga de un informe guardado; estado de carga y borrador por secciones; **429 con mensaje amable sin perder los apuntes**; error del servidor; envía los apuntes a la evaluación; guarda las secciones editadas; error al guardar. |
| `evaluacion-ia.spec.js` | `EvaluacionIa` (evaluación con nota) | 15 | Aviso "Apoyo generado por IA; la decisión final es del evaluador"; nota grande, competencias con barra (`progressbar`) y justificación, "Sin evidencia" sin barra, bloques de fortalezas, mejoras y recomendaciones, autoría; sin permiso no hay botón; botón deshabilitado si falta el CV o el Word; estado de carga "Generando… puede tardar hasta 1 minuto"; el borrador **no se guarda** hasta confirmar; avisos de recorte; **429 amable**; errores del servidor y genéricos; descartar; confirmar y guardar (cuerpo enviado) y error al guardar. |
| `modulos.spec.js` | Todos los módulos de `src/` | 2 | Prueba de humo: todo carga y exporta funciones; hace que el reporte incluya todos los archivos. |
| **Total** | | **163** | |

Notas:

- **Validación del teléfono chileno:** la expresión regular no está exportada, así que se prueba
  a través de los formularios que la usan (`/postular` y `SolicitudFormulario`).
- **Contraseña de 6 caracteres en el registro:** el navegador solo aplica `minlength` a lo que la
  persona escribe con el teclado; si el valor lo pone un script, nunca lo marca como "muy
  corto". Por eso la prueba verifica la regla declarada en el campo (`required` y
  `minlength=6`) en vez de simular el bloqueo. El backend además rechaza contraseñas cortas.
- **CampoPassword, informe con IA y evaluación con nota:** existen solo en la rama
  `feature/integracion-ia`, así que sus pruebas (y este documento con 163 pruebas) son de esa rama.

## 5. Mocks usados

En Jasmine los mocks se hacen con **spies** (`spyOn`, `jasmine.createSpy`): reemplazan una
función real por una falsa que registra cómo la llamaron y devuelve lo que la prueba decide.

| Qué se simula | Cómo | Dónde |
| ------------- | ---- | ----- |
| El backend (axios) | `spyOn(api, "get" / "post" / "put" / "patch" / "delete")` sobre la instancia compartida de axios, con `.and.resolveTo(...)` o `.and.rejectWith(...)`. `simularGet({ ruta: respuesta })` responde distinto según la ruta; una ruta no declarada responde 404 para que la prueba falle en vez de pasar en silencio. Ninguna prueba sale a la red. | Casi todas |
| La capa HTTP de axios (para los interceptores) | Un **adapter falso** pasado en la configuración de la petición (`api.get(url, { adapter })`). La petición recorre los interceptores reales y el adapter recibe la configuración final (con la cabecera ya agregada) o responde un `AxiosError` 401/500. | api-interceptores |
| El manejador de sesión expirada | `jasmine.createSpy` registrado con `registrarManejadorNoAutorizado`. | api-interceptores |
| La sesión / contexto de autenticación | `AuthProvider` real con `token` y `usuario` en `localStorage`. | Navbar, RutaProtegida, Panel, Login, Registro, SolicitudDetalle |
| Las rutas | `MemoryRouter` con pantallas de destino de prueba para comprobar redirecciones. | Varias |
| Callbacks de componentes | `jasmine.createSpy("onChange" / "alGuardar" / "alCancelar")`. | SelectorCv, SolicitudFormulario |
| La confirmación del navegador | `spyOn(window, "confirm").and.returnValue(true / false)`. | Panel (eliminar) |
| APIs del navegador para descargar | `spyOn(URL, "createObjectURL")`, `spyOn(URL, "revokeObjectURL")`, `spyOn(HTMLAnchorElement.prototype, "click")`. | ArchivoDescargable |
| El reloj | `jasmine.clock().mockDate(...)`. | fechas |
| Una respuesta lenta de la IA | `spyOn(api, "post").and.returnValue(new Promise(...))`: la promesa queda pendiente para comprobar el estado de carga y luego la prueba la resuelve. Ninguna prueba llama a Gemini. | evaluacion-ia, informe-psicolaboral |
| Cuota agotada de la IA | `errorAxios(429, ...)`. | evaluacion-ia, informe-psicolaboral |

**Por qué se espía la instancia de axios y no los servicios:** los servicios son módulos ES y
sus exportaciones no se pueden reemplazar desde afuera; `api` es un objeto, así que
`spyOn(api, "post")` sí funciona, y además se prueba el servicio real.

## 6. Resultados

Salida de `npm run test:cobertura` (3.ª ronda, rama `feature/integracion-ia`):

```
Chrome Headless 154.0.0.0 (Windows 10): Executed 163 of 163 SUCCESS (1.124 secs / 1.041 secs)
TOTAL: 163 SUCCESS

 src               |      25 |        0 |       0 |      25 |
 src/components    |   98.88 |    92.38 |     100 |   98.85 |
 src/context       |   97.22 |       75 |     100 |   97.22 |
 src/pages         |   95.52 |    89.72 |    95.4 |   96.68 |
 src/services      |   94.64 |     64.7 |   97.05 |   96.29 |
 src/utils         |     100 |      100 |     100 |     100 |

Statements   : 96.07% ( 587/611 )
Branches     : 88.66% ( 391/441 )
Functions    : 96.84% ( 184/190 )
Lines        : 96.85% ( 554/572 )
```

### Cobertura por archivo

| Archivo | Sentencias | Ramas | Funciones | Líneas |
| ------- | ---------: | ----: | --------: | -----: |
| **Total** | 96,07 % | 88,66 % | 96,84 % | 96,85 % |
| `src/App.jsx` | 25,00 % | 0,00 % | 0,00 % | 25,00 % |
| `src/components/ArchivoDescargable.jsx` | 100,00 % | 93,75 % | 100,00 % | 100,00 % |
| `src/components/CampoPassword.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/EtiquetaPostulacionPublica.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/EvaluacionIa.jsx` | 100,00 % | 96,22 % | 100,00 % | 100,00 % |
| `src/components/InformePsicolaboral.jsx` | 100,00 % | 81,48 % | 100,00 % | 100,00 % |
| `src/components/Navbar.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/RutaProtegida.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/SelectorCv.jsx` | 100,00 % | 87,50 % | 100,00 % | 100,00 % |
| `src/components/SolicitudFormulario.jsx` | 96,22 % | 96,72 % | 100,00 % | 96,00 % |
| `src/context/AuthContext.jsx` | 97,22 % | 75,00 % | 100,00 % | 97,22 % |
| `src/pages/Dashboard.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/Login.jsx` | 100,00 % | 83,33 % | 100,00 % | 100,00 % |
| `src/pages/NuevaSolicitud.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/Panel.jsx` | 98,21 % | 92,50 % | 95,65 % | 97,91 % |
| `src/pages/Postular.jsx` | 89,47 % | 88,23 % | 92,85 % | 90,74 % |
| `src/pages/Registro.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/pages/SolicitudDetalle.jsx` | 95,32 % | 88,17 % | 93,93 % | 97,82 % |
| `src/services/api.js` | 100,00 % | 81,81 % | 100,00 % | 100,00 % |
| `src/services/archivoService.js` | 76,00 % | 33,33 % | 75,00 % | 82,60 % |
| `src/services/authService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/dashboardService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/evaluacionService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/familiaService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/informeService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/postulacionService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/solicitudService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/usuarioService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/utils/fechas.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
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
- **Estabilidad:** 8 corridas seguidas en orden aleatorio, siempre 118/118 (2.ª ronda); 3
  corridas seguidas, siempre 163/163 (3.ª ronda). Se eliminaron las
  advertencias `act(...)` de React (venían de la prueba del 401, donde el manejador actualiza el
  estado desde una promesa de axios; ahora esa llamada va dentro de `act`).

## 7. Lo que NO está cubierto y por qué

| Qué | Por qué no |
| --- | ---------- |
| `App.jsx` (25 %) | Solo declara las rutas de la aplicación. Cada ruta se prueba por separado (páginas y `RutaProtegida`); renderizar `App` completo duplicaría esas pruebas. |
| `main.jsx` (fuera del reporte) | Monta la app en el `#root` de `index.html`; no tiene lógica propia. |
| `archivoService.js`: ramas de respaldo (33 % de ramas) | Cuando la cabecera `Content-Disposition` no viene, viene mal codificada o el error no es un Blob. Se cubrió el caso normal y el error típico; los respaldos son defensivos. |
| `Postular.jsx` líneas 51-52 y 56-57; `SolicitudFormulario.jsx` 51-52 | Validaciones repetidas al enviar (teléfono y CV). No se pueden alcanzar desde la interfaz porque el botón ya está deshabilitado con datos inválidos; forzarlas exigiría disparar el envío saltándose el botón, que no es algo que haga un usuario. |
| `Postular.jsx` línea 188 | El `onChange` del campo trampa (honeypot) oculto; solo lo llenan bots. El comportamiento del honeypot se verifica en el backend. |
| `SolicitudDetalle.jsx` 319 y 383; `Panel.jsx` 178 | Cambiar la fecha en el formulario de evaluación (se prueba con la fecha por defecto y al editar), cerrar el modal haciendo clic en el fondo y cancelar la edición de una evaluación. Son interacciones menores. |
| `AuthContext.jsx` línea 61 | El error de usar `useAuth` fuera de un `AuthProvider`: es un aviso para quien programa, no un caso de la app. |
| `api.js` ramas 3 y 29 | La URL por defecto cuando no hay `VITE_API_URL` (en las pruebas siempre se define) y una petición de error sin `config`. |
| `InformePsicolaboral.jsx` (81 % de ramas) y `EvaluacionIa.jsx` (96 % de ramas) | Respaldos para datos guardados incompletos (`data.apuntes || ""`, informe sin `modeloIa`) y la evaluación guardada sin autor. Son defensivos: el backend siempre guarda esos campos. |
| Estilos (Tailwind) y apariencia | Las pruebas unitarias verifican comportamiento, no diseño. |
| Backend | Esta evaluación pide pruebas del frontend; el backend se verificó con scripts de API y pruebas end-to-end que no forman parte de esta suite. En la rama IA, la evaluación con nota se verificó con 61 comprobaciones contra el backend real y Gemini simulado (ver la sección de IA del README). |
