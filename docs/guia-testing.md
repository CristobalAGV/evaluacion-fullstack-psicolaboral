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
Executed 41 of 41 SUCCESS
TOTAL: 41 SUCCESS
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

## 7. Resultados del proyecto en una frase

**41 pruebas, todas aprobadas.** Cubren casi por completo las piezas clave: login, rutas
protegidas por rol, barra de navegación, formulario público de postulación (con validación de
teléfono y CV), descarga segura de archivos, Kanban con la regla del evaluador y el arreglo de
fechas. La cobertura total es de **44 % de líneas**, porque las pantallas más grandes (detalle
de solicitud y formulario de solicitud) aún no tienen pruebas; están listadas como trabajo
pendiente en `cobertura-testing.md`.

Y una comprobación extra: rompimos a propósito la regla del Kanban y **la prueba correspondiente
falló**, que es justo lo que tiene que pasar.
