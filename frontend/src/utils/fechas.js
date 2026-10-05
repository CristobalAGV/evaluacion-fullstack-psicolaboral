// Las fechas de evaluación son días de calendario guardados como medianoche UTC
// ("2026-10-05T00:00:00.000Z"). Se formatean en UTC para que en Chile no aparezcan un día antes.
export function formatearFechaCalendario(fechaIso) {
  if (!fechaIso) return "-";
  return new Date(fechaIso).toLocaleDateString("es-CL", { timeZone: "UTC" });
}

// Fecha de hoy según el reloj local, en formato AAAA-MM-DD (el de <input type="date">).
// toISOString() daría la fecha UTC, que en la noche de Chile ya es el día siguiente.
export function hoyLocal() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}
