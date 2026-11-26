import { grupos } from "../config/camposPreseleccion";

export default function CamposPreseleccion({ grupo, datos = {}, requisitos = {} }) {
  return <div className="row g-2">
    {grupos[grupo].map(([campo, etiqueta, tipo, multiple]) => {
      const nombre = `${grupo}.${campo}`;
      const actual = datos[campo];
      if (tipo === "check") return <label key={campo} className="col-md-6">
        <input className="form-check-input me-2" type="checkbox" name={nombre} defaultChecked={actual} />{etiqueta}
      </label>;
      const opciones = tipo === "siNo" ? [["si", "Sí"], ["no", "No"]] : tipo;
      return <label key={campo} className="col-md-6 form-label mb-0">
        {etiqueta}
        {Array.isArray(opciones) ? (
          <select name={nombre} className="form-select" multiple={multiple}
            defaultValue={multiple ? (actual ?? []) : tipo === "siNo" ? (actual == null ? "" : actual ? "si" : "no") : actual ?? ""}>
            {!multiple && <option value="">Sin especificar</option>}
            {multiple && grupo === "antecedentes" && <option value="ninguna">Ninguna</option>}
            {opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        ) : <input className="form-control" name={nombre} type={tipo === "numero" ? "number" : "text"}
          {...(tipo === "numero" ? { min: 0, max: 70, step: "any" } : { maxLength: tipo === "lista" ? 2000 : 100 })}
          defaultValue={Array.isArray(actual) ? actual.length ? actual.join(", ") : grupo === "antecedentes" ? "Ninguno" : "" : actual} />}
        {requisitos[campo]?.length > 0 && <span className="form-text">La oferta solicita: {requisitos[campo].join(", ")}</span>}
      </label>;
    })}
  </div>;
}
