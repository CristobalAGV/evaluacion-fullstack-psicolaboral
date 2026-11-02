# Cobertura y testing del proyecto real

Ejecución: 2 de noviembre de 2026. Estas cifras provienen del repositorio real,
no de una copia de auditoría.

339 pruebas frontend aprobadas en 22 archivos. Cobertura: **96,66 % statements,
90,52 % branches, 98,83 % functions y 97,53 % lines**.

## Reproducir

Desde `frontend/`: `npm.cmd test`, `npm.cmd run test:cobertura`,
`npm.cmd run build` y `npm.cmd run lint`. Los cuatro finalizaron con código 0.
Lint conserva dos warnings previos de Fast Refresh en AuthContext y
EtiquetaPostulacionPublica. No se observaron warnings de React en los tests.
El reporte HTML queda en
`frontend/coverage/index.html`; los totales y esta tabla se obtuvieron de
`frontend/coverage/coverage-summary.json`. Vitest ejecuta en orden aleatorio.

## Alcance

- Registro interno: solo admin abre `/registro`; conserva token y usuario del administrador.
- El candidato utiliza `/postular` sin cuenta; `/login` permanece público.
- Registro con 401 usa el manejo normal de sesión expirada; 403 conserva la sesión.
- IA conservada para EP3. En EP2 las flags son `VITE_IA_HABILITADA=false` e
  `IA_HABILITADA=false`. Solo `"true"` habilita. Se verifica que apagada no monta
  InformePsicolaboral ni hace consultas. Las pruebas previas de IA habilitan
  explícitamente el módulo para conservar su cobertura.
- Modal: nombre, foco inicial, Tab/Shift+Tab, Escape y restauración del foco.
  Se mantienen pruebas de cierre por botón, Cancelar y fondo.
- Formularios: asociaciones de errores, aria-invalid y foco al primer inválido;
  CampoArchivo asocia label, ayuda y error. El menú anuncia abierto/cerrado.
- Se mantienen las pruebas de servicios, Kanban, filtros, archivos, evaluaciones
  e informe de entrevista manual.
- Fecha y hora de solicitud: conversión local ↔ ISO/UTC, ausencia/null, fechas
  imposibles, preservación del instante al editar y horario de America/Santiago
  en verano, invierno y cambio DST (la comprobación de zona explícita corre desde backend).
- Resultado final: separado del estado, Aprobada/Rechazada/null, permisos,
  transiciones y eliminación al salir de Finalizada.
- Mensaje adicional: opcional, límite de 800 caracteres, sanitización y saltos
  de línea; envío por FormData y visualización como texto en el detalle.

## Backend reproducible

`cd backend` y `npm.cmd test`: **57 pruebas aprobadas**. `servicioIa.test.js`
simula Gemini; `ep2.test.js` verifica JWT/roles, rechazo de crear admin, respuesta
201 sin token y las seis rutas IA condicionadas por flag con el 404 normal.
También comprueba que permanecen registradas entrevista y evaluaciones manuales.
`solicitud-campos.test.js` verifica los campos nuevos, permisos, fechas imposibles,
conversión horaria y preservación de fecha, resultado, mensaje y archivos al hacer PUT.
El test de registro simula persistencia. No se mide cobertura backend ni se
atribuyen resultados a scripts externos que no están en este repositorio.
Los tests conservan avisos de deprecación de `validateSync()` de Mongoose.

Comprobación histórica del 1 de noviembre (no repetida en este cierre):
`npm.cmd run dev` conectó a MongoDB y escuchó en 4000 fuera del
sandbox; el primer intento tuvo timeout DNS. Health 200 y consultas autenticadas
a informe IA/evaluación IA 404. Credenciales originales conservadas.

## Límites

Las pruebas frontend usan jsdom y axios simulado: no acreditan integración completa
con MongoDB, apariencia final ni una auditoría exhaustiva de accesibilidad.
No se realizaron pruebas de carga ni llamadas a Gemini real. Los caminos sin
cubrir pueden revisarse en el HTML; alcanzar cobertura no garantiza ausencia de errores.

La revisión básica de archivos versionables no detectó claves privadas ni tokens
reales; los `.env` reales están ignorados y el índice está vacío. Se detectó que
el JWT local conserva el valor de ejemplo de la plantilla histórica. Debe
reemplazarse por un secreto propio antes de usar datos reales o desplegar;
no se modificó durante este cierre para no invalidar las sesiones existentes.

## Cobertura por archivo

| Archivo | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `src/App.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/ArchivoDescargable.jsx` | 100 % | 93.75 % | 100 % | 100 % |
| `src/components/CampoArchivo.jsx` | 100 % | 92.3 % | 100 % | 100 % |
| `src/components/CampoPassword.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/EtiquetaPostulacionPublica.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/EvaluacionIa.jsx` | 100 % | 95.23 % | 100 % | 100 % |
| `src/components/FiltrosPanel.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/Footer.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/InformePsicolaboral.jsx` | 100 % | 82.75 % | 100 % | 100 % |
| `src/components/InsigniaResultado.jsx` | 100 % | 75 % | 100 % | 100 % |
| `src/components/Modal.jsx` | 93.93 % | 79.16 % | 100 % | 100 % |
| `src/components/Navbar.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/NavbarPublico.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/RutaProtegida.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/SelectorCv.jsx` | 100 % | 87.5 % | 100 % | 100 % |
| `src/components/Sidebar.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/components/SolicitudFormulario.jsx` | 94.87 % | 91.66 % | 100 % | 94.73 % |
| `src/config/catalogoCargos.js` | 100 % | 100 % | 100 % | 100 % |
| `src/config/funcionalidades.js` | 100 % | 100 % | 100 % | 100 % |
| `src/config/solicitud.js` | 100 % | 100 % | 100 % | 100 % |
| `src/context/AuthContext.jsx` | 96.87 % | 75 % | 100 % | 96.87 % |
| `src/hooks/useValidacionFormulario.js` | 87.5 % | 80 % | 100 % | 88.88 % |
| `src/layouts/AppLayout.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/layouts/PublicLayout.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/layouts/enlaces.js` | 100 % | 100 % | 100 % | 100 % |
| `src/pages/Dashboard.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/pages/Login.jsx` | 100 % | 83.33 % | 100 % | 100 % |
| `src/pages/NotFoundPage.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/pages/NuevaSolicitud.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/pages/Panel.jsx` | 97.43 % | 91.66 % | 100 % | 97.22 % |
| `src/pages/Postular.jsx` | 92.94 % | 91.54 % | 95 % | 93.82 % |
| `src/pages/Registro.jsx` | 100 % | 100 % | 100 % | 100 % |
| `src/pages/SolicitudDetalle.jsx` | 96.72 % | 92.24 % | 97.43 % | 99.07 % |
| `src/services/api.js` | 100 % | 81.81 % | 100 % | 100 % |
| `src/services/archivoService.js` | 76 % | 40 % | 75 % | 82.6 % |
| `src/services/authService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/services/dashboardService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/services/evaluacionService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/services/familiaService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/services/informeService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/services/postulacionService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/services/solicitudService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/services/usuarioService.js` | 100 % | 100 % | 100 % | 100 % |
| `src/utils/fechas.js` | 100 % | 100 % | 100 % | 100 % |
| `src/utils/filtrosPanel.js` | 100 % | 100 % | 100 % | 100 % |
| `src/utils/mensajeErrorIa.js` | 100 % | 100 % | 100 % | 100 % |
