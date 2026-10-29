import { useId } from "react";
import "./SelectorCv.css";

// Zona clickable para elegir un archivo (por defecto, el CV). El <input type="file"> queda
// oculto visualmente y toda la zona funciona como su etiqueta. Lo usa el detalle de la solicitud
// para subir el informe de entrevista.
export default function SelectorCv({
  etiqueta,
  archivo,
  onChange,
  required = false,
  accept = ".pdf,.doc,.docx",
  textoSeleccionar = "Haz clic para seleccionar el CV",
  formatos = "PDF, DOC o DOCX · máx. 5MB",
}) {
  const id = useId();

  return (
    <div>
      <span className="form-label d-block">{etiqueta}</span>
      <label
        htmlFor={id}
        className="selector-cv d-flex flex-column align-items-center justify-content-center gap-1 border border-2 rounded bg-body-tertiary px-3 py-4 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          width="32"
          height="32"
          className="text-primary"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 7.5 12 3m0 0L7.5 7.5M12 3v13.5"
          />
        </svg>
        {archivo ? (
          <>
            <span className="fw-medium text-break">{archivo.name}</span>
            <span className="small text-primary">Haz clic para cambiar el archivo</span>
          </>
        ) : (
          <>
            <span className="fw-medium text-primary">{textoSeleccionar}</span>
            <span className="small text-secondary">{formatos}</span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept={accept}
          required={required}
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="visually-hidden"
        />
      </label>
    </div>
  );
}
