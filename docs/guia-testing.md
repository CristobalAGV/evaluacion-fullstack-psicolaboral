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

Usamos tres herramientas que trabajan juntas:

- **Jasmine:** el lenguaje para escribir las pruebas (`describe`, `it`, `expect`).
- **Karma:** el "motor" que abre un navegador y corre las pruebas ahí.
- **ChromeHeadless:** Google Chrome sin ventana. Es un navegador real, pero invisible, así que
  las pruebas corren rápido y sin abrir nada en pantalla.

Además, **esbuild** traduce nuestro código React (JSX) a algo que el navegador entiende, y
**Testing Library** permite buscar elementos como lo haría una persona: "el botón que dice
Ingresar", "el campo Correo".

Para correrlas, dentro de `frontend/`:

```bash
npm test                 # corre todas las pruebas
npm run test:cobertura   # corre las pruebas y mide la cobertura
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
  spyOn(api, "post").and.rejectWith(errorAxios(401, "Credenciales inválidas"));
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

En Jasmine los mocks se hacen con **spies** ("espías"):

```js
const post = spyOn(api, "post").and.resolveTo({ data: { mensaje: "Postulación recibida" } });
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
Executed 118 of 118 SUCCESS
TOTAL: 118 SUCCESS
```

- `SUCCESS`: todas pasaron.
- Si algo falla, aparece `FAILED` con el nombre de la prueba y el motivo, por ejemplo
  `Expected spy click to have been called once. It was called 0 times.`

**La tabla de cobertura** (con `npm run test:cobertura`):

```
File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
Postular.jsx    |   89.47 |    88.23 |   92.85 |   90.74 | 51-52,56-57,188
```

- Cada columna es una de las medidas de la sección 5.
- **Uncovered Line #s** son las líneas que ninguna prueba ejecutó: es la lista de "qué falta
  probar".

**El reporte visual:** abre `frontend/coverage/html/index.html` en el navegador. Cada archivo
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

### Una trampa de Jasmine con `waitFor`

En Jasmine, un `expect` que falla **no detiene** la prueba en ese momento: solo anota la
falla. `waitFor` (de Testing Library) espera hasta que su función *no lance un error*; como
el `expect` de Jasmine no lanza, `waitFor` terminaba de inmediato. Por eso creamos
`esperarQue(condición)`, que sí lanza un error mientras la condición no se cumpla.

### Pruebas de mutación: ¿las pruebas detectan errores?

Una cobertura alta no prueba que las pruebas sirvan. Para comprobarlo, **metimos errores a
propósito** en la app y corrimos las pruebas:

- `api.js` deja de mandar el token → falla "agrega el token…".
- El registro ofrece el rol admin → falla "el selector de rol NO ofrece admin".
- Cualquier usuario puede subir el informe → falla "evaluador ajeno: solo puede mirar".

Cada error fue detectado por la prueba que lo cuida. Después se dejó el código como estaba.

### Lo que el navegador no deja simular

La regla "contraseña de al menos 6 caracteres" (`minlength`) el navegador la aplica **solo a
lo que la persona escribe con el teclado**, no a un valor puesto por un script. Por eso esa
prueba verifica que la regla esté declarada en el campo, en vez de fingir algo que el
navegador no hace. Es mejor decirlo que forzar una prueba engañosa.

## 8. Resultados del proyecto en una frase

**118 pruebas, todas aprobadas**, estables en 8 corridas seguidas en orden aleatorio. La
cobertura subió de **44 % a 95,86 % de líneas** (y de 33 % a **88,19 % de ramas**). Cubre login
y registro, rutas protegidas por rol, interceptores de sesión, el formulario público, el
detalle de solicitud con sus permisos por rol, evaluaciones, informe Word, descarga segura de
archivos, el Kanban completo y todos los servicios.

Lo que falta (y por qué) está en `cobertura-testing.md`, sección 7.
