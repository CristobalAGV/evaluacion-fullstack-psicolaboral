# Guía rápida de git para este proyecto

Una **rama** es una copia paralela del proyecto. Sirve para probar cosas
nuevas sin tocar la versión que funciona. Este repo tiene dos:

| Rama | Para qué sirve |
| ---- | -------------- |
| `main` | La versión oficial, la que se entrega y se despliega. **No experimentar aquí.** |
| `feature/integracion-ia` | Espacio para probar la integración de IA, que no es parte del alcance evaluado. |

Además hay una **etiqueta** (tag) llamada `v1.0-mvp`. Una etiqueta es una
foto congelada de un momento del proyecto: marca el MVP terminado, para
poder volver a él si algo se rompe más adelante.

## Ver en qué rama estoy

```bash
git status
```

La primera línea dice `On branch main` o `On branch feature/integracion-ia`.
También sirve `git branch`: muestra la lista y la actual lleva un `*`.

## Cambiar de rama

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

## Subir lo que trabajaste en la rama de IA

```bash
git push origin feature/integracion-ia
```

Estando en `main`, se sube igual pero con `git push origin main`.

## Si la rama no aparece (por ejemplo, en otro computador)

```bash
git fetch origin                      # trae las novedades del remoto
git checkout feature/integracion-ia   # ya la encuentra y la crea localmente
```

## Volver a la foto del MVP

```bash
git checkout v1.0-mvp
```

Esto te deja "mirando" ese punto del historial, no en una rama (git lo llama
*detached HEAD*). Para volver a la normalidad:

```bash
git checkout main
```

## Dos cosas que conviene recordar

- Si las dos ramas tienen dependencias distintas, después de cambiar corre
  `npm install` en `backend/` y en `frontend/`.
- El archivo `.env` no viaja entre ramas: no está versionado (por seguridad,
  porque tiene la contraseña de la base de datos). Se queda tal cual en tu
  carpeta al cambiar de rama.
