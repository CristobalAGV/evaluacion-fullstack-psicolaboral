import { esPostulacionPublica } from "../components/EtiquetaPostulacionPublica";

export const FILTROS_INICIALES = { busqueda: "", area: "", responsable: "", origen: "todas" };

// Minúsculas y sin tildes, para que "perez" encuentre "Pérez".
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function hayFiltrosActivos(filtros) {
  return (
    filtros.busqueda.trim() !== "" ||
    filtros.area !== "" ||
    filtros.responsable !== "" ||
    filtros.origen !== "todas"
  );
}

// Aplica los filtros en el cliente sobre las solicitudes ya cargadas (no cambia su estado).
export function filtrarSolicitudes(solicitudes, filtros) {
  const texto = normalizar(filtros.busqueda.trim());

  return solicitudes.filter((s) => {
    if (texto && !normalizar(s.candidato?.nombre).includes(texto) && !normalizar(s.cargo).includes(texto)) return false;
    if (filtros.area && s.familiaDeCargo?.nombre !== filtros.area) return false;
    if (filtros.responsable && s.profesionalResponsable?.nombre !== filtros.responsable) return false;
    if (filtros.origen === "publica" && !esPostulacionPublica(s)) return false;
    if (filtros.origen === "analista" && esPostulacionPublica(s)) return false;
    return true;
  });
}

// Valores distintos (sin vacíos y ordenados) para las opciones de un filtro.
export function opcionesUnicas(solicitudes, obtener) {
  const valores = new Set(solicitudes.map(obtener).filter(Boolean));
  return [...valores].sort((a, b) => a.localeCompare(b, "es"));
}
