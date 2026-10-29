# Guía de testing del frontend (para la presentación)

Explicación corta, en palabras simples, de cómo probamos el frontend. Los detalles técnicos y
los números están en [`cobertura-testing.md`](cobertura-testing.md).

## 1. ¿Qué es una prueba unitaria?

Es un pequeño programa que **revisa automáticamente que una parte de la app haga lo que debe**.
En vez de abrir la página y hacer clic a mano cada vez, la prueba lo hace sola en segundos y
avisa si algo se rompió.

"Unitaria" significa que prueba **una pieza a la vez**: una función (por ejemplo, la que
formatea fechas) o un componente (por ejemplo, el botón de descargar un CV).

## 2. El entorno de pruebas

Usamos estas herramientas, que trabajan juntas:

- **Vitest:** escribe y corre las pruebas (`describe`, `it`, `expect`). Está integrado con Vite,
  la herramienta con la que ya se construye la app, así que entiende nuestro código React (JSX)
  sin configuración extra.
- **jsdom:** un navegador simulado dentro de Node. No abre ninguna ventana, así que las pruebas
  corren rápido.
- **Testing Library:** permite buscar elementos como lo haría una persona: "el botón que dice
  Ingresar", "el campo Correo".

Para correrlas, dentro de `frontend/`:

```bash
npm test                 # corre todas las pruebas (vitest run)
npm run test:cobertura   # corre las pruebas y mide la cobertura (vitest run --coverage)
```

## 3. Cómo se escribe una prueba

Cada prueba sigue tres pasos, conocidos como **Arrange – Act – Assert**:

1. **Preparar (Arrange):** dejar todo listo (mostrar el componente, simular el servidor).
2. **Actuar (Act):** hacer lo que haría el usuario (escribir, hacer clic).
3. **Comprobar (Assert):** revisar que el resultado sea el esperado.

Ejemplo real del proyecto (login con contraseña incorrecta):

```js
it("muestra el mensaje del servidor cuando las credenciales son inválidas", async () => {
  // Preparar: el "servidor" responde 401
  vi.spyOn(api, "post").mockRejectedValue(errorAxios(401, "Credenciales inválidas"));
  renderizar(<Login />, { ruta: "/login", rutaDelElemento: "/login" });

  // Actuar: la persona escribe y aprieta "Ingresar"
  completarYEnviar("ana@ejemplo.cl", "clave-mala");

  // Comprobar: aparece el error y no se guarda la sesión
  expect(await screen.findByText("Credenciales inválidas")).toBeTruthy();
  expect(localStorage.getItem("token")).toBeNull();
});
```

- `describe("Login", ...)` agrupa las pruebas de un mismo componente.
- `it("...", ...)` es una prueba; su texto dice qué debería pasar.
- `expect(valor).toBe(...)` es la comprobación. Si no se cumple, la prueba falla.

## 4. Mocks y spies: simular lo que no queremos usar de verdad

En una prueba unitaria **no queremos depender del servidor real** (puede estar apagado, ser
lento o cambiar los datos). Por eso lo **simulamos**. A esa versión falsa se le llama **mock**.

En Vitest los mocks se hacen con **spies** ("espías"):

```js
const post = vi.spyOn(api, "post").mockResolvedValue({ data: { mensaje: "Postulación recibida" } });
```

Esto hace dos cosas:

1. **Reemplaza** la función real que llama al servidor por una falsa que responde lo que
   nosotros decidimos (éxito o error).
2. **Anota cómo la llamaron**, para poder comprobarlo después:

```js
expect(post).toHaveBeenCalledOnceWith("/auth/login", { correo: "ana@ejemplo.cl", password: "secreto123" });
```

En el proyecto simulamos: el servidor (axios), la sesión iniciada (guardada en
`localStorage`), las rutas (`MemoryRouter`), la descarga de archivos y el reloj (para probar
qué pasa a las 23:30, cuando en hora UTC ya es el día siguiente).

## 5. Cobertura de código

La **cobertura** mide **qué porcentaje del código se ejecutó** mientras corrían las pruebas.
Si una línea nunca se ejecutó, ninguna prueba la está revisando.

Se mide de cuatro formas:

| Medida | Qué significa |
| ------ | ------------- |
| **Sentencias** (Statements) | Instrucciones del código que se ejecutaron. |
| **Ramas** (Branches) | Caminos de cada `if`/`? :` que se probaron (el "sí" y el "no"). |
| **Funciones** (Functions) | Funciones que se llamaron al menos una vez. |
| **Líneas** (Lines) | Líneas de código que se ejecutaron. |

Ojo: **100 % de cobertura no significa "sin errores"**. Significa que el código se ejecutó,
no que se haya comprobado todo. Por eso lo importante es que las pruebas tengan buenos
`expect`, no solo subir el porcentaje.

## 6. Cómo leer los resultados

**En la terminal**, al final de `npm test`:

```
 Test Files  15 passed (15)
      Tests  163 passed (163)
```

- `passed`: todas pasaron.
- Si algo falla, aparece `FAIL` con el nombre de la prueba y el motivo, por ejemplo
  `expected "spy" to be called 1 times, but got 0 times`.

**La tabla de cobertura** (con `npm run test:cobertura`):

```
File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
Postular.jsx    |   89.47 |    88.23 |   92.85 |   90.74 | 51-52,56-57,188
```

- Cada columna es una de las medidas de la sección 5.
- **Uncovered Line #s** son las líneas que ninguna prueba ejecutó: es la lista de "qué falta
  probar".

**El reporte visual:** abre `frontend/coverage/index.html` en el navegador. Cada archivo
se ve con colores: **verde** = ejecutado por las pruebas, **rojo** = no ejecutado,
**amarillo** = condición probada solo en uno de sus caminos.

## 7. Ideas extra que usamos

### Probar un interceptor con un "adapter" falso

`api.js` tiene **interceptores**: código que corre en *todas* las peticiones (agrega el token)
y en *todas* las respuestas con error (si llega un 401, cierra la sesión). Si espiamos
`api.get` directamente, la petición nunca pasa por ellos.

Por eso usamos un **adapter falso**: el adapter es la pieza de axios que hace la llamada HTTP
real. Le pasamos uno de mentira que no sale a Internet y responde lo que queremos:

```js
await api.get("/solicitudes", { adapter: adapterConError(401) });
```

La petición recorre los interceptores de verdad y llega al adapter falso. Así comprobamos que
la cabecera `Authorization` se agregó y que, ante un 401, la app borra la sesión y lleva al
login con el mensaje "Tu sesión expiró, vuelve a iniciar sesión".

### `act()`: avisarle a React que algo va a cambiar

Cuando algo cambia el estado de un componente **fuera de un clic o de un evento** (por ejemplo,
cuando responde una promesa), React pide envolverlo en `act(...)`. Si no, muestra una
advertencia en la consola. Lo usamos en la prueba del 401.

### `waitFor` y `esperarQue`

`waitFor` (de Testing Library) espera hasta que su función *no lance un error*. En Vitest un
`expect` que falla sí lanza, así que sirve directo dentro de `waitFor`. Aun así mantenemos
`esperarQue(condición)` (en `ayudantes.jsx`): lanza un error con una descripción clara mientras
la condición no se cumpla.

### Pruebas de mutación: ¿las pruebas detectan errores?

Una cobertura alta no prueba que las pruebas sirvan. Para comprobarlo, **metimos errores a
propósito** en la app y corrimos las pruebas:

- `api.js` deja de mandar el token → falla "agrega el token…".
- El registro ofrece el rol admin → falla "el selector de rol NO ofrece admin".
- Cualquier usuario puede subir el informe → falla "evaluador ajeno: solo puede mirar".

Al migrar a Vitest se repitió con tres errores nuevos (CV de ~95 MB aceptado en `Postular`, el
interceptor de `api.js` mirando el 403 en vez del 401, y `hoyLocal()` con el mes corrido) y
Vitest los detectó todos.

Cada error fue detectado por la prueba que lo cuida. Después se dejó el código como estaba.

### Lo que no se puede simular

La regla "contraseña de al menos 6 caracteres" (`minlength`) el navegador la aplica **solo a
lo que la persona escribe con el teclado**, no a un valor puesto por un script. Por eso esa
prueba verifica que la regla esté declarada en el campo, en vez de fingir algo que el
navegador no hace. (Tampoco existe `DataTransfer` en jsdom, así que el ayudante `elegirArchivo` entrega el archivo de otra forma.) Es mejor decirlo que forzar una prueba engañosa.

## 8. Resultados del proyecto en una frase

**163 pruebas, todas aprobadas**, en orden aleatorio. La cobertura es de
**96,85 % de líneas y 88,88 % de ramas** (subió desde 44 % de líneas y 33 % de ramas en la
primera ronda). Cubre login
y registro, rutas protegidas por rol, interceptores de sesión, el formulario público, el
detalle de solicitud con sus permisos por rol, evaluaciones, informe Word, descarga segura de
archivos, el Kanban completo y todos los servicios.

Lo que falta (y por qué) está en `cobertura-testing.md`, sección 7.
