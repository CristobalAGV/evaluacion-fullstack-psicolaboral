# Frontend — Evaluación Psicolaboral

Aplicación React 19 + Vite + Bootstrap 5 del proyecto. Se puede usar por separado del resto
del repositorio: solo necesita una API del backend a la cual conectarse.

## Requisitos

- Node.js 22.12 o superior (probado con Node 24) y npm.

## Instalar

```bash
npm install
```

## Configurar

Copia `.env.example` como `.env` y ajusta la URL de la API (incluye el sufijo `/api`):

```
VITE_API_URL=http://localhost:4000/api
VITE_IA_HABILITADA=false
```

## Ejecutar

```bash
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # versión de producción en dist/
npm run preview    # sirve la versión de producción
```

## Probar

Pruebas unitarias con Vitest (entorno jsdom):

```bash
npm test                 # una sola ejecución
npm run test:cobertura   # además genera el reporte en coverage/ (abrir coverage/index.html)
```

Las pruebas están en `src/pruebas/` y la configuración en la sección `test` de `vite.config.js`.

Más detalle: `docs/cobertura-testing.md` y `docs/guia-testing.md` en la raíz del repositorio.

## Estado EP2 validado

339 pruebas frontend aprobadas en 22 archivos. Cobertura: **96,66 % statements,
90,52 % branches, 98,83 % functions y 97,53 % lines**. Build aprobado.
Lint (`npm.cmd run lint`) devuelve código 0 con dos warnings previos de Fast Refresh
en AuthContext y EtiquetaPostulacionPublica. Backend: 57/57 pruebas aprobadas.

`/login` y `/postular` son públicos; los candidatos postulan sin cuenta.
`/registro` es interno y exclusivo de admin; crear usuarios conserva su sesión.
La IA se conserva para EP3 y queda desactivada por flag (solo `"true"` habilita).

Las solicitudes permiten programar fecha y hora de evaluación (hora local en la
interfaz, instante ISO/UTC al guardar) y definir Aprobada/Rechazada como resultado
separado de Pendiente → En proceso → Finalizada. Solo analista/admin gestionan
estos campos; salir de Finalizada quita el resultado. La postulación pública
incluye un mensaje opcional de hasta 800 caracteres, visible en el detalle con
sus saltos de línea.

Resultados del proyecto real: 2 de noviembre de 2026. Ver las guías de `../docs/`.
