import { useId, useState } from "react";

// Campo de contraseña con un botón para alternar entre puntitos y texto visible,
// para poder revisar lo que se escribió antes de enviar el formulario.
export default function CampoPassword({
  value,
  onChange,
  etiqueta = "Contraseña",
  autoComplete,
  minLength,
  required = true,
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {etiqueta}
      </label>
      <div className="input-group">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className="form-control"
        />
        <button
          type="button"
          onClick={() => setVisible((estaVisible) => !estaVisible)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="btn btn-outline-secondary"
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
    </div>
  );
}
