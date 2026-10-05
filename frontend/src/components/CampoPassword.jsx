import { useId, useState } from "react";

const campoClases =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

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
    <div className="flex flex-col gap-1 text-sm text-slate-700">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className={`${campoClases} w-full pr-20`}
        />
        <button
          type="button"
          onClick={() => setVisible((estaVisible) => !estaVisible)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 rounded-r-md px-3 text-xs font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
    </div>
  );
}
