# Evaluación Psicolaboral — Automatización de Reclutamiento y Selección

Proyecto Fullstack 2. Sistema para automatizar el proceso de evaluación
psicolaboral dentro de un flujo de Reclutamiento y Selección.

**Estado actual: MVP completo**, etiquetado como `v1.0-mvp`. Cubre el
alcance evaluado del curso (Caso DSY1104 + Anexo AquaChile): autenticación
con roles, solicitudes con panel Kanban, evaluaciones y dashboard de
indicadores. La integración de IA queda fuera de ese alcance y se
experimenta en una rama aparte — ver [Ramas del proyecto](#ramas-del-proyecto).

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

Roles disponibles: `analista`, `evaluador`, `admin`.

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

## Ramas del proyecto

Una **rama** es una copia paralela del proyecto. Sirve para probar cosas
nuevas sin tocar la versión que funciona. Este repo tiene dos:

| Rama | Para qué sirve |
| ---- | -------------- |
| `main` | La versión oficial, la que se entrega y se despliega. **No experimentar aquí.** |
| `feature/integracion-ia` | Espacio para probar la integración de IA, que no es parte del alcance evaluado. |

Además hay una **etiqueta** (tag) llamada `v1.0-mvp`. Una etiqueta es una
foto congelada de un momento del proyecto: marca el MVP terminado, para
poder volver a él si algo se rompe más adelante.

### Ver en qué rama estoy

```bash
git status
```

La primera línea dice `On branch main` o `On branch feature/integracion-ia`.
También sirve `git branch`: muestra la lista y la actual lleva un `*`.

### Cambiar de rama

**Antes de cambiar, guarda tu trabajo.** Git no te deja cambiar de rama si
tienes cambios sin guardar (o peor, se los lleva a la otra rama). Revisa con
`git status`; si aparecen archivos modificados, haz un commit:

```bash
git add .
git commit -m "describe brevemente lo que hiciste"
```

Luego cambia de rama:

```bash
git checkout feature/integracion-ia   # ir a la rama de IA
git checkout main                     # volver a la oficial
```

Al cambiar de rama, los archivos de tu carpeta cambian solos: el editor te
va a mostrar la versión de esa rama. Es normal, no se borró nada.

### Subir lo que trabajaste en la rama de IA

```bash
git push origin feature/integracion-ia
```

Estando en `main`, se sube igual pero con `git push origin main`.

### Si la rama no aparece (por ejemplo, en otro computador)

```bash
git fetch origin                      # trae las novedades del remoto
git checkout feature/integracion-ia   # ya la encuentra y la crea localmente
```

### Volver a la foto del MVP

```bash
git checkout v1.0-mvp
```

Esto te deja "mirando" ese punto del historial, no en una rama (git lo llama
*detached HEAD*). Para volver a la normalidad:

```bash
git checkout main
```

### Dos cosas que conviene recordar

- Si las dos ramas tienen dependencias distintas, después de cambiar corre
  `npm install` en `backend/` y en `frontend/`.
- El archivo `.env` no viaja entre ramas: no está versionado (por seguridad,
  porque tiene la contraseña de la base de datos). Se queda tal cual en tu
  carpeta al cambiar de rama.

## Próximos pasos (fuera de este sprint)

- Automatización de carpetas de solicitudes/candidatos.
- Asistente de entrevistas con IA.
- CRUD completo de Solicitudes, Candidatos, Entrevistas e Informes.
