import api from "./api";

// Lee el nombre de "Content-Disposition" (prefiere filename* en UTF-8).
function nombreDesdeCabecera(cabecera) {
  if (!cabecera) return "";
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecera);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      // Si viene mal codificado, se usa el nombre ASCII de respaldo.
    }
  }
  const simple = /filename="([^"]+)"/i.exec(cabecera);
  return simple ? simple[1] : "";
}

// Descarga un archivo guardado en MongoDB. Va por axios para enviar el token (no hay enlaces
// públicos) y luego dispara la descarga en el navegador.
export async function descargarArchivo(id, nombreSugerido = "archivo") {
  const respuesta = await api.get(`/archivos/${id}`, { responseType: "blob" });
  const nombre = nombreDesdeCabecera(respuesta.headers["content-disposition"]) || nombreSugerido;

  const url = URL.createObjectURL(respuesta.data);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Con responseType "blob" el error de la API también llega como Blob: se lee su "mensaje".
export async function mensajeDeErrorDescarga(error) {
  const datos = error.response?.data;
  if (datos instanceof Blob) {
    try {
      return JSON.parse(await datos.text()).mensaje || "";
    } catch {
      return "";
    }
  }
  return datos?.mensaje || "";
}
