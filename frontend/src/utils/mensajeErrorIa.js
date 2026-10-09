// Mensaje para mostrar cuando falla una llamada que usa IA. La cuota agotada (429) recibe un
// texto propio y tranquilizador; el resto usa el mensaje del servidor o uno genérico.
export const MENSAJE_CUOTA_AGOTADA =
  "El servicio de IA alcanzó su límite de uso por ahora. Espera unos minutos y vuelve a intentarlo; no se perdió nada de lo que tenías.";

export function mensajeErrorIa(err, porDefecto) {
  if (err?.response?.status === 429) return MENSAJE_CUOTA_AGOTADA;
  return err?.response?.data?.mensaje || porDefecto;
}
