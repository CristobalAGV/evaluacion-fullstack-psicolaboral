# Evaluación Psicolaboral — Automatización de Reclutamiento y Selección

Proyecto Fullstack 2. Sistema para automatizar el proceso de evaluación
psicolaboral dentro de un flujo de Reclutamiento y Selección.

**Estado actual: Sprint 0 — setup inicial.** Solo incluye el esqueleto
funcional (estructura de carpetas, modelos de datos y autenticación con
JWT). Todavía no hay automatización de carpetas, IA ni asistente de
entrevistas.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express (API REST)
- **Base de datos:** MongoDB + Mongoose
- **Autenticación:** JWT (registro/login con roles)

## Estructura del repo

```
/backend    API REST (Express, Mongoose, JWT)
/frontend   Cliente React (Vite)
```

## Requisitos previos

- Node.js 18+ y npm
- Una instancia de MongoDB corriendo (local en `mongodb://localhost:27017`
  o en MongoDB Atlas)

## Backend

```bash
cd backend
npm install
cp .env.example .env   # editar valores si hace falta (Mongo URI, JWT secret, etc.)
npm run dev            # levanta con nodemon en http://localhost:4000
```

Variables de entorno (`backend/.env`):

| Variable       | Descripción                                 |
| -------------- | -------------------------------------------- |
| `PORT`         | Puerto del servidor (default 4000)          |
| `MONGO_URI`    | Cadena de conexión a MongoDB                 |
| `JWT_SECRET`   | Secreto para firmar los tokens JWT           |
| `JWT_EXPIRES_IN` | Expiración del token (ej. `1d`)            |
| `CORS_ORIGIN`  | Origen permitido para CORS (URL del frontend)|

Endpoints disponibles:

- `GET /api/health` — chequeo de estado
- `POST /api/auth/registro` — crea un usuario (`nombre`, `correo`, `password`, `rol`)
- `POST /api/auth/login` — devuelve `{ usuario, token }`
- `GET /api/auth/perfil` — requiere header `Authorization: Bearer <token>`

Roles disponibles: `analista`, `psicologo`, `admin`.

Modelos definidos (`backend/src/models`): `Usuario`, `FamiliaDeCargo`,
`Solicitud`, `Candidato`, `Entrevista`, `Informe`.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env   # editar VITE_API_URL si el backend corre en otro puerto/host
npm run dev             # levanta en http://localhost:5173
```

Estructura (`frontend/src`):

```
components/   componentes reutilizables (Navbar, RutaProtegida)
pages/        vistas (Login, Registro, Dashboard)
services/     cliente axios y llamadas a la API (api.js, authService.js)
context/      AuthContext (estado de sesión, token en localStorage)
```

## Flujo local completo

1. Levantar MongoDB.
2. `cd backend && npm run dev` (puerto 4000).
3. `cd frontend && npm run dev` (puerto 5173).
4. Abrir `http://localhost:5173`, registrarse y loguearse.

## Próximos pasos (fuera de este sprint)

- Automatización de carpetas de solicitudes/candidatos.
- Asistente de entrevistas con IA.
- CRUD completo de Solicitudes, Candidatos, Entrevistas e Informes.
