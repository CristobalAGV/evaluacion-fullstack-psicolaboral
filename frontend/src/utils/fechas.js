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

const dosDigitos = (numero) => String(numero).padStart(2, "0");

// Fecha y hora de una solicitud (un instante, no un día de calendario), en la hora local del
// navegador y con el mismo formato día-mes-año: "05-11-2026 10:30". Sin fecha o inválida: "-".
export function formatearFechaHora(fechaIso) {
  if (!fechaIso) return "-";
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return "-";
  const dia = `${dosDigitos(fecha.getDate())}-${dosDigitos(fecha.getMonth() + 1)}-${fecha.getFullYear()}`;
  return `${dia} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// Valor para un <input type="datetime-local"> ("AAAA-MM-DDTHH:mm", hora local) a partir de la fecha
// guardada. Sin fecha o inválida: texto vacío.
export function aValorDatetimeLocal(fechaIso) {
  if (!fechaIso) return "";
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// Lo contrario: el valor del input (hora local, sin zona) pasa a un instante en ISO/UTC para
// enviarlo al backend. Vacío: "" (sin fecha). Valor que no es una fecha: null.
export function desdeValorDatetimeLocal(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  // Rechaza normalizaciones de calendario y horas inexistentes por cambio de horario.
  return Number.isNaN(fecha.getTime()) || aValorDatetimeLocal(fecha) !== valor
    ? null
    : fecha.toISOString();
}
