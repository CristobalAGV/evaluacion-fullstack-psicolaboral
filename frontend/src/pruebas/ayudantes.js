// Utilidades compartidas por las pruebas.
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import api from "../services/api";

// Simula una sesión iniciada tal como la deja el login: AuthProvider lee el usuario de localStorage.
export function iniciarSesionSimulada(usuario) {
  localStorage.setItem("token", "token-de-prueba");
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

export function limpiarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

export const USUARIOS = {
  analista: { id: "u-analista", nombre: "Ana Analista", correo: "ana@ejemplo.cl", rol: "analista" },
  evaluador: { id: "u-evaluador", nombre: "Eva Evaluadora", correo: "eva@ejemplo.cl", rol: "evaluador" },
  admin: { id: "u-admin", nombre: "Adela Admin", correo: "adela@ejemplo.cl", rol: "admin" },
};

// Renderiza un componente dentro de un router en memoria y del AuthProvider real.
// rutasExtra permite declarar pantallas de destino para comprobar redirecciones.
export function renderizar(elemento, { ruta = "/", rutaDelElemento = "*", rutasExtra = [] } = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route path={rutaDelElemento} element={elemento} />
          {rutasExtra.map(({ path, texto }) => (
            <Route key={path} path={path} element={<p>{texto}</p>} />
          ))}
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

// Respuesta de error con la forma que entrega axios.
export function errorAxios(estado, mensaje) {
  const error = new Error(`Request failed with status code ${estado}`);
  error.response = { status: estado, data: { mensaje } };
  return error;
}

// Archivo de prueba de un tamaño dado (en bytes).
export function archivoDePrueba(nombre, tipo, bytes = 10) {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

// Elige un archivo en un <input type="file"> como lo haría el navegador: con DataTransfer se
// llena un FileList real, así la validación nativa (atributo required) lo reconoce.
export function elegirArchivo(input, archivo) {
  const transferencia = new DataTransfer();
  transferencia.items.add(archivo);
  input.files = transferencia.files;
  fireEvent.change(input);
}

// Espera hasta que la condición sea verdadera. En Jasmine un expect() fallido no lanza error, así
// que dentro de waitFor se usa una condición que sí lance para que waitFor siga reintentando.
export function esperarQue(condicion, descripcion = "la condición esperada") {
  return waitFor(() => {
    if (!condicion()) throw new Error(`Todavía no se cumple: ${descripcion}`);
  });
}

// Simula varias rutas GET del backend a la vez con un spy sobre axios. Cada clave es una ruta y
// su valor la respuesta (o un Error para simular una falla). Una ruta no declarada responde 404,
// así una pantalla que pida algo inesperado hace fallar la prueba en vez de pasar en silencio.
export function simularGet(respuestas) {
  return spyOn(api, "get").and.callFake((ruta) => {
    if (!(ruta in respuestas)) return Promise.reject(errorAxios(404, `Ruta no simulada en la prueba: ${ruta}`));
    const respuesta = respuestas[ruta];
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve({ data: respuesta });
  });
}
