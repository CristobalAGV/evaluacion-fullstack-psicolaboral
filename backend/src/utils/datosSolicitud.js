// Reglas compartidas de los campos nuevos de la solicitud: resultado final, fecha de evaluación
// y mensaje adicional del candidato.

export const RESULTADOS = ["Aprobada", "Rechazada"];
export const MAX_MENSAJE_ADICIONAL = 800;

export const MENSAJE_FECHA_INVALIDA = "La fecha y hora de evaluación no es válida";
export const MENSAJE_MENSAJE_LARGO = `El mensaje adicional no puede superar los ${MAX_MENSAJE_ADICIONAL} caracteres.`;

// Fecha con o sin hora y con o sin zona horaria: "2026-11-05", "2026-11-05T10:30" o
// "2026-11-05T13:30:00.000Z". Cualquier otra cosa se rechaza.
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const ANIO_MINIMO = 2000;
const ANIO_MAXIMO = 2100;

// Interpreta el valor recibido en el cuerpo de la petición.
//  - undefined: el campo no vino, no hay que tocar el dato guardado ({ omitida: true }).
//  - null o texto vacío: se quita la fecha ({ fecha: null }).
//  - texto con fecha válida: ({ fecha: Date }).
//  - cualquier otra cosa: ({ error }).
export function interpretarFechaEvaluacion(valor) {
  if (valor === undefined) return { omitida: true };
  if (valor === null) return { fecha: null };
  if (typeof valor !== "string") return { error: MENSAJE_FECHA_INVALIDA };

  const texto = valor.trim();
  if (texto === "") return { fecha: null };
  if (!FORMATO_FECHA.test(texto)) return { error: MENSAJE_FECHA_INVALIDA };

  // Date normaliza días inexistentes (p. ej. 30 de febrero) en lugar de rechazarlos.
  const [anioTexto, mes, dia] = texto.slice(0, 10).split("-").map(Number);
  const diasDelMes = new Date(Date.UTC(anioTexto, mes, 0)).getUTCDate();
  const hora = texto.includes("T") ? Number(texto.slice(11, 13)) : 0;
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes || hora > 23) {
    return { error: MENSAJE_FECHA_INVALIDA };
  }

  const fecha = new Date(texto);
  const anio = fecha.getUTCFullYear();
  if (Number.isNaN(fecha.getTime()) || anio < ANIO_MINIMO || anio > ANIO_MAXIMO) {
    return { error: MENSAJE_FECHA_INVALIDA };
  }
  return { fecha };
}

// Limpia el mensaje adicional conservando los saltos de línea: quita etiquetas HTML y caracteres de
// control, junta espacios repetidos y limita las líneas en blanco seguidas. No lo corta: si supera
// el máximo, quien lo llama responde un error en vez de guardar un texto recortado.
export function limpiarMensajeAdicional(valor) {
  if (typeof valor !== "string") return "";
  return valor
    .replace(/\r\n?/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
