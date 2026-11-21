import api from "./api";

export async function listarOfertas({ publicas = false, q, familia, area, region, modalidad } = {}) {
  const { data } = await api.get(publicas ? "/ofertas/publicas" : "/ofertas", {
    params: Object.fromEntries(Object.entries({ q, familia, area, region, modalidad }).filter(([, valor]) => valor)),
  });
  return data;
}

export async function obtenerOferta(id, publica = false) {
  const { data } = await api.get(`/ofertas${publica ? "/publicas" : ""}/${id}`);
  return data;
}

export function guardarOferta(campos, id) {
  return id ? api.put(`/ofertas/${id}`, campos) : api.post("/ofertas", campos);
}

export function cambiarPublicacion(id, publicada) {
  return api.patch(`/ofertas/${id}/publicacion`, { publicada });
}

export function archivarOferta(id) {
  return api.delete(`/ofertas/${id}`);
}
