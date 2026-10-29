import { useId } from "react";

// Campo para elegir un archivo (por defecto, el CV) con Bootstrap: muestra el nombre del archivo
// elegido y una ayuda con los formatos permitidos. "error" marca el campo como inválido.
export default function CampoArchivo({
  nombre,
  etiqueta,
  archivo,
  onChange,
  error,
  required = false,
  accept = ".pdf,.doc,.docx",
  ayuda = "PDF, DOC o DOCX · máx. 5 MB",
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {etiqueta}
      </label>
      <input
        id={id}
        name={nombre}
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => onChange(e.target.files[0] || null)}
        aria-invalid={Boolean(error)}
        className={`form-control${error ? " is-invalid" : ""}`}
      />
      {error && <div className="invalid-feedback">{error}</div>}
      <div className="form-text">{ayuda}</div>
      {archivo && (
        <div className="form-text text-body">
          Archivo seleccionado: <span className="fw-medium text-break">{archivo.name}</span>
        </div>
      )}
    </div>
  );
}
