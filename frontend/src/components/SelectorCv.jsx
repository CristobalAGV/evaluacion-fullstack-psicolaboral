// Zona clickable para elegir el CV. El <input type="file"> queda oculto y toda la tarjeta
// funciona como su etiqueta.
export default function SelectorCv({ etiqueta, archivo, onChange, required = false }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{etiqueta}</span>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-8 w-8 text-indigo-500"
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
            <span className="font-medium text-slate-900 break-all">{archivo.name}</span>
            <span className="text-xs text-indigo-600">Haz clic para cambiar el archivo</span>
          </>
        ) : (
          <>
            <span className="font-medium text-indigo-600">Haz clic para seleccionar el CV</span>
            <span className="text-xs text-slate-500">PDF, DOC o DOCX · máx. 5MB</span>
          </>
        )}
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          required={required}
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="sr-only"
        />
      </label>
    </div>
  );
}
