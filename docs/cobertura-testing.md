# Cobertura de testing del frontend

Documento de las pruebas unitarias del frontend (React 19 + Vite) hechas con **Jasmine** y
**Karma**. Los números de este documento son los de la última ejecución real de
`npm run test:cobertura` (5 de octubre de 2026): **41 pruebas, 41 aprobadas, 0 fallidas**.

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

**Cómo se mide la cobertura:** `karma-esbuild` no instrumenta el código por sí solo. En
`karma.conf.cjs` hay un plugin chico de esbuild que, solo al correr `test:cobertura`, pasa cada
archivo de `src/` (menos las pruebas) por `istanbul-lib-instrument`. `karma-coverage` recoge el
resultado del navegador y escribe los reportes en `frontend/coverage/`.

## 2. Cómo ejecutar

Desde `frontend/`, con Chrome instalado:

```bash
npm install                 # una vez
npm test                    # una sola ejecución en ChromeHeadless
npm run test:cobertura      # igual, más el reporte de cobertura
```

- El resultado aparece en la terminal (`TOTAL: 41 SUCCESS`).
- El reporte de cobertura navegable queda en `frontend/coverage/html/index.html`; el resumen en
  `frontend/coverage/coverage-summary.json`. La carpeta `coverage/` no se versiona.
- Las pruebas corren en orden aleatorio (`random: true`), para detectar pruebas que dependan
  unas de otras. Se corrió la suite varias veces seguidas y siempre pasaron las 41.

## 3. Organización

- Las pruebas están en `frontend/src/pruebas/*.spec.js`. Usan extensión `.js` (con JSX adentro)
  porque `karma-esbuild` exige que los archivos de entrada de prueba terminen en `.js`.
- Cada prueba sigue el patrón **Arrange – Act – Assert** (preparar, actuar, comprobar).
- `ayudantes.js` reúne utilidades: simular una sesión, renderizar con router y `AuthProvider`,
  crear errores con forma de axios, crear archivos de prueba, elegir un archivo en un input y
  esperar una condición.

## 4. Pruebas por componente

| Archivo de pruebas | Qué se prueba | N.º | Qué verifica |
| ------------------ | ------------- | :-: | ------------ |
| `fechas.spec.js` | `utils/fechas.js` | 4 | La fecha `2026-10-05T00:00:00Z` se muestra como `05-10-2026` (no un día antes); sin fecha muestra `-`; `hoyLocal()` usa el día local aunque en UTC ya sea el siguiente (reloj simulado a las 23:30); formato `AAAA-MM-DD` con ceros. |
| `componentes-simples.spec.js` | `EtiquetaPostulacionPublica` | 2 | Muestra "Postulación pública"; `esPostulacionPublica` distingue el origen (y tolera datos vacíos). |
| | `SelectorCv` | 4 | Texto y formatos aceptados sin archivo; entrega el archivo elegido al padre (spy); muestra el nombre del archivo; acepta otros formatos/textos (informe Word). |
| `autenticacion.spec.js` | `Login` | 3 | Llama al servicio con correo y contraseña y redirige al inicio guardando el token; con credenciales inválidas (401) muestra el mensaje y no guarda sesión; enlace "Postula aquí". |
| | `RutaProtegida` | 4 | Sin sesión redirige a `/login`; con sesión muestra el contenido; con un rol no permitido redirige al inicio; con un rol permitido muestra el contenido. |
| | `Navbar` | 4 | Sin sesión: "Iniciar sesión" y "Registrarse"; analista: "Panel", "Nueva solicitud", nombre y rol; evaluador: sin "Nueva solicitud"; "Cerrar sesión" borra la sesión. |
| `postular.spec.js` | `Postular` (incluye la validación del teléfono chileno y del CV) | 8 | Carga las áreas desde el endpoint público y muestra el ejemplo de correo; rechaza un teléfono no chileno y deshabilita el envío; acepta `+56 9` con y sin espacios; rechaza CV de más de 5 MB; rechaza tipo no permitido (PNG); envía un `FormData` con todos los campos (incluido el honeypot vacío) y muestra "Postulación recibida"; muestra el error del servidor (409); avisa si no cargan las áreas. |
| `archivo-descargable.spec.js` | `ArchivoDescargable` + `archivoService` | 4 | Datos antiguos: "Archivo no disponible" sin botón; sin archivo: "Sin archivo"; al descargar llama a `GET /archivos/:id` con `responseType: "blob"`, crea la URL y descarga con el nombre original (UTF-8); si falla, muestra el mensaje del servidor que llega como Blob. |
| `panel.spec.js` | `Panel` (Kanban) | 6 | Tres columnas y cada solicitud en la suya; sin evaluador muestra "Asignar evaluador" (y no "Mover a En proceso"); con evaluador mueve de estado llamando a `PATCH /solicitudes/:id/estado`; "Eliminar" no aparece para el analista; sí para el admin; el evaluador ve el tablero sin botones de gestión. |
| `modulos.spec.js` | Todos los módulos de `src/` | 2 | Prueba de humo: componentes, páginas y servicios cargan y exportan funciones. Además hace que el reporte incluya los archivos sin pruebas propias. |
| **Total** | | **41** | |

Notas sobre lo pedido:

- **Validación del teléfono chileno:** la expresión regular no está exportada (vive dentro de
  `Postular.jsx` y `SolicitudFormulario.jsx`), así que se prueba a través del formulario
  `/postular`, que es como la usa el candidato.
- **SelectorCv y los límites de 5 MB y tipo:** `SelectorCv` solo permite elegir el archivo; la
  validación de tamaño y tipo la hace la pantalla que lo usa. Por eso esos dos casos están en
  `postular.spec.js`, usando el `SelectorCv` real dentro del formulario.
- **CampoPassword (mostrar/ocultar):** ese componente existe solo en la rama
  `feature/integracion-ia`; en `main` el login usa un campo de contraseña normal. No se porta a
  `main` para no cambiar el comportamiento de la app, así que no tiene pruebas acá.

## 5. Mocks usados

En Jasmine los mocks se hacen con **spies** (`spyOn`, `jasmine.createSpy`): reemplazan una
función real por una falsa que registra cómo la llamaron y devuelve lo que la prueba decide.

| Qué se simula | Cómo | Dónde |
| ------------- | ---- | ----- |
| El backend (axios) | `spyOn(api, "get" / "post" / "patch")` sobre la instancia compartida de axios (`services/api.js`), con `.and.resolveTo(...)` para respuestas exitosas y `.and.rejectWith(...)` para errores (401, 404, 409, 500). Ninguna prueba hace llamadas de red reales. | Login, Postular, Panel, ArchivoDescargable |
| La sesión / contexto de autenticación | Se usa el `AuthProvider` real y la sesión se simula dejando `token` y `usuario` en `localStorage`, que es de donde el proveedor la lee. | Navbar, RutaProtegida, Panel, Login |
| Las rutas | `MemoryRouter` con rutas de destino de prueba ("Pantalla de login", "Pantalla de inicio") para comprobar redirecciones. | RutaProtegida, Login, Navbar, Panel, Postular |
| Callbacks de componentes | `jasmine.createSpy("onChange")` para comprobar qué entrega `SelectorCv`. | SelectorCv |
| APIs del navegador para descargar | `spyOn(URL, "createObjectURL")`, `spyOn(URL, "revokeObjectURL")` y `spyOn(HTMLAnchorElement.prototype, "click")`, para no descargar archivos de verdad. | ArchivoDescargable |
| El reloj | `jasmine.clock().mockDate(...)` para fijar "ahora" (23:30 del 5 de octubre). | fechas |

**Por qué se espía la instancia de axios y no los servicios:** los servicios son módulos ES
(`export function ...`) y sus exportaciones no se pueden reemplazar desde afuera; la instancia
`api` es un objeto, así que `spyOn(api, "post")` sí funciona. Así además se prueba el servicio
real (qué ruta y qué datos envía).

**Por qué no se reemplaza `useAuth`:** por la misma razón (es una exportación de un módulo ES)
y porque `AuthContext` no exporta el contexto. Usar el proveedor real con `localStorage`
simulado prueba además la lectura de la sesión.

## 6. Resultados

Salida de `npm run test:cobertura` (resumen):

```
Chrome Headless 154.0.0.0 (Windows 10): Executed 41 of 41 SUCCESS
TOTAL: 41 SUCCESS

Statements   : 42.22% ( 209/495 )
Branches     : 32.91% ( 106/322 )
Functions    : 36% ( 54/150 )
Lines        : 44.13% ( 203/460 )
```

### Cobertura por archivo

| Archivo | Sentencias | Ramas | Funciones | Líneas |
| ------- | ---------: | ----: | --------: | -----: |
| **Total** | 42,22 % | 32,91 % | 36,00 % | 44,13 % |
| `src/App.jsx` | 25,00 % | 0,00 % | 0,00 % | 25,00 % |
| `src/components/ArchivoDescargable.jsx` | 100,00 % | 93,75 % | 100,00 % | 100,00 % |
| `src/components/EtiquetaPostulacionPublica.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/Navbar.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/RutaProtegida.jsx` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/components/SelectorCv.jsx` | 100,00 % | 87,50 % | 100,00 % | 100,00 % |
| `src/components/SolicitudFormulario.jsx` | 5,66 % | 0,00 % | 0,00 % | 6,00 % |
| `src/context/AuthContext.jsx` | 66,66 % | 75,00 % | 75,00 % | 66,66 % |
| `src/pages/Dashboard.jsx` | 8,33 % | 0,00 % | 0,00 % | 9,09 % |
| `src/pages/Login.jsx` | 100,00 % | 66,66 % | 100,00 % | 100,00 % |
| `src/pages/NuevaSolicitud.jsx` | 0,00 % | 100,00 % | 0,00 % | 0,00 % |
| `src/pages/Panel.jsx` | 58,92 % | 67,50 % | 47,82 % | 62,50 % |
| `src/pages/Postular.jsx` | 89,47 % | 88,23 % | 92,85 % | 90,74 % |
| `src/pages/Registro.jsx` | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| `src/pages/SolicitudDetalle.jsx` | 3,73 % | 0,00 % | 0,00 % | 4,34 % |
| `src/services/api.js` | 38,88 % | 9,09 % | 20,00 % | 41,17 % |
| `src/services/archivoService.js` | 76,00 % | 33,33 % | 75,00 % | 82,60 % |
| `src/services/authService.js` | 33,33 % | 100,00 % | 33,33 % | 33,33 % |
| `src/services/dashboardService.js` | 0,00 % | 100,00 % | 0,00 % | 0,00 % |
| `src/services/evaluacionService.js` | 0,00 % | 100,00 % | 0,00 % | 0,00 % |
| `src/services/familiaService.js` | 0,00 % | 100,00 % | 0,00 % | 0,00 % |
| `src/services/postulacionService.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |
| `src/services/solicitudService.js` | 14,81 % | 0,00 % | 25,00 % | 15,38 % |
| `src/services/usuarioService.js` | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| `src/utils/fechas.js` | 100,00 % | 100,00 % | 100,00 % | 100,00 % |

(Cuando un archivo no tiene condiciones, istanbul informa 100 % de ramas aunque no se haya
ejecutado: por eso `NuevaSolicitud.jsx` aparece con 0 % de sentencias y 100 % de ramas.)

### Análisis

- **Bien cubierto (≈90–100 %):** las piezas pedidas como mínimo. Fechas, etiqueta, selector de
  CV, descarga de archivos, ruta protegida, barra de navegación, login y el formulario público.
- **Parcial:** `Panel.jsx` (≈60 %): se prueban las columnas, la regla del evaluador, mover de
  estado y la visibilidad por rol; faltan eliminar, editar en el modal y los errores de carga.
  `AuthContext.jsx` (≈67 %): falta el registro y la expiración de sesión.
- **Total 42 % de sentencias:** es bajo porque varias pantallas grandes no tienen pruebas
  todavía (ver sección 7). El número es honesto: incluye todos los archivos de `src/` excepto
  `main.jsx`, también los que no se prueban.

### Verificación de que las pruebas detectan errores

Para comprobar que las pruebas no pasan "siempre", se rompió a propósito la regla del Kanban en
`Panel.jsx` (mostrar "Mover a En proceso" aunque no haya evaluador). Resultado:
`TOTAL: 1 FAILED, 40 SUCCESS`; falló justamente "sin evaluador muestra 'Asignar evaluador' en
vez de 'Mover a En proceso'". Luego se restauró el archivo.

## 7. Lo que NO está cubierto y por qué

| Qué | Por qué no |
| --- | ---------- |
| `SolicitudDetalle.jsx` (detalle, evaluaciones, subida del informe Word) | Es la pantalla más grande (≈390 líneas) y combina varias llamadas a la API; queda para una siguiente iteración. |
| `SolicitudFormulario.jsx` (crear/editar solicitud, asignar evaluador) | Mismo motivo; depende de familias y evaluadores cargados desde la API. Su validación de teléfono es la misma que se prueba en `/postular`. |
| `Registro.jsx`, `Dashboard.jsx`, `NuevaSolicitud.jsx` | Fuera del mínimo pedido. El registro sin rol admin se verificó en el backend y en pruebas manuales/end-to-end, no con pruebas unitarias. |
| Interceptores de `api.js` (agregar el token y manejar el 401 de sesión expirada) | Las pruebas espían los métodos de axios (`get`, `post`…), así que la petición no pasa por los interceptores. Probarlos requiere simular el adaptador HTTP de axios. |
| Servicios sin uso en las pantallas probadas (`dashboardService`, `evaluacionService`, `familiaService`, `usuarioService`, gran parte de `solicitudService`) | Se ejecutan solo desde pantallas que aún no tienen pruebas. |
| `main.jsx` | Monta la app en el `#root` de `index.html`; no tiene lógica propia y no se importa en las pruebas (no aparece en el reporte). |
| `CampoPassword` (mostrar/ocultar contraseña) | Solo existe en la rama `feature/integracion-ia`, no en `main`. |
| Estilos (Tailwind) y apariencia | Las pruebas unitarias verifican comportamiento, no diseño. |
| Backend | Esta evaluación pide pruebas del frontend; el backend se probó con scripts de API y pruebas end-to-end manuales que no forman parte de esta suite. |
