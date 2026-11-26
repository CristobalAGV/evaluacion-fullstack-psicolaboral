const niveles = Object.entries({ media: "Media", tecnico: "Técnico", profesional: "Profesional", postgrado: "Postgrado" });
const modalidades = [["presencial", "Presencial"], ["híbrida", "Híbrida"], ["remota", "Remota"]];
export const grupos = {
  excluyentes: [
    ["nivelEstudios", "Nivel mínimo de estudios", niveles], ["carreras", "Carreras aceptadas", "lista"],
    ["experienciaAnios", "Años mínimos de experiencia", "numero"], ["conocimientos", "Conocimientos obligatorios", "lista"],
    ["certificaciones", "Certificaciones obligatorias", "lista"], ["licencia", "Exigir licencia de conducir", "check"],
    ["modalidades", "Modalidades aceptadas", modalidades, true], ["disponibilidad", "Exigir disponibilidad para el cargo", "check"],
  ],
  deseables: [["conocimientos", "Conocimientos deseables", "lista"], ["industrias", "Industrias deseables", "lista"]],
  antecedentes: [
    ["nivelEstudios", "Nivel de estudios", niveles], ["carrera", "Título o carrera", "texto"],
    ["experienciaAnios", "Años de experiencia", "numero"], ["conocimientos", "Conocimientos técnicos", "lista"],
    ["certificaciones", "Certificaciones", "lista"], ["licencia", "Licencia de conducir", "siNo"],
    ["modalidades", "Modalidades disponibles", modalidades, true], ["disponibilidad", "Disponibilidad para el cargo", "siNo"],
    ["industrias", "Industrias en las que tienes experiencia", "lista"],
  ],
};
export function leerCamposPreseleccion(formulario, grupo) {
  const datos = {};
  for (const [campo, , tipo, multiple] of grupos[grupo]) {
    const nombre = `${grupo}.${campo}`;
    const valores = formulario.getAll(nombre);
    formulario.delete(nombre);
    const valor = valores[0]?.trim();
    if (tipo === "check") datos[campo] = Boolean(valor);
    else if (multiple) {
      if (valores.length) datos[campo] = valores.includes("ninguna") ? [] : valores;
    } else if (valor) {
      if (tipo === "lista") datos[campo] = grupo === "antecedentes" && /^ningun[oa]$/i.test(valor)
        ? [] : valor.split(",").map((item) => item.trim()).filter(Boolean);
      else if (tipo === "numero") datos[campo] = Number(valor);
      else datos[campo] = tipo === "siNo" ? valor === "si" : valor;
    }
  }
  return datos;
}
