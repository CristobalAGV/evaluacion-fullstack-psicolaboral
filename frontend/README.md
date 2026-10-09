# Frontend — Evaluación Psicolaboral

Aplicación React 19 + Vite + Tailwind CSS del proyecto. Se puede usar por separado del resto
del repositorio: solo necesita una API del backend a la cual conectarse.

## Requisitos

- Node.js 20 o superior (probado con Node 24) y npm.
- Google Chrome instalado (para las pruebas).

## Instalar

```bash
npm install
```

## Configurar

Copia `.env.example` como `.env` y ajusta la URL de la API (incluye el sufijo `/api`):

```
VITE_API_URL=http://localhost:4000/api
```

## Ejecutar

```bash
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # versión de producción en dist/
npm run preview    # sirve la versión de producción
```

## Probar

Pruebas unitarias con Jasmine + Karma en Chrome sin interfaz (ChromeHeadless):

```bash
npm test                 # una sola ejecución
npm run test:cobertura   # además genera el reporte en coverage/ (abrir coverage/html/index.html)
```

Las pruebas están en `src/pruebas/` y la configuración en `karma.conf.cjs`. Si Chrome no está
en la ruta habitual, indica su ubicación con la variable de entorno `CHROME_BIN`.

Más detalle: `docs/cobertura-testing.md` y `docs/guia-testing.md` en la raíz del repositorio.
