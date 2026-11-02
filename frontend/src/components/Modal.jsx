import { useEffect, useRef } from "react";

// Modal con el marcado de Bootstrap pero sin su JavaScript: lo muestra o lo oculta quien lo usa
// (con useState) y se cierra con el botón de la cabecera, con un clic en el fondo o con Escape.
// tamano: clase opcional de Bootstrap, por ejemplo "modal-lg". pie: contenido opcional del modal-footer.
export default function Modal({ etiqueta, onCerrar, tamano = "", pie = null, children }) {
  const dialogoRef = useRef(null);
  const cerrarRef = useRef(onCerrar);

  // Guarda siempre la última función de cierre, sin volver a registrar el listener de Escape.
  useEffect(() => {
    cerrarRef.current = onCerrar;
  });

  useEffect(() => {
    const anterior = document.activeElement;
    function alPresionarTecla(e) {
      if (e.key === "Tab") {
        const campos = [...dialogoRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter((campo) => !campo.closest("[hidden], [aria-hidden=true]"));
        const primero = campos[0];
        const ultimo = campos.at(-1);
        if (!primero) { e.preventDefault(); dialogoRef.current.focus(); }
        else if (e.shiftKey && (document.activeElement === primero || document.activeElement === dialogoRef.current)) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && (document.activeElement === ultimo || document.activeElement === dialogoRef.current)) { e.preventDefault(); primero.focus(); }
      }
      if (e.key === "Escape") cerrarRef.current();
    }
    document.addEventListener("keydown", alPresionarTecla);
    // Igual que el modal de Bootstrap: evita que la página de atrás se desplace.
    document.body.classList.add("modal-open");
    dialogoRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", alPresionarTecla);
      document.body.classList.remove("modal-open");
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);

  return (
    <>
      <div
        ref={dialogoRef}
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        onClick={(e) => {
          // Solo el fondo: los clics dentro del cuadro no llegan con este elemento como destino.
          if (e.target === e.currentTarget) onCerrar();
        }}
      >
        <div className={`modal-dialog modal-dialog-scrollable ${tamano}`.trim()}>
          <div className="modal-content">
            <div className="modal-header border-0 pb-0">
              <button type="button" className="btn-close ms-auto" aria-label="Cerrar" onClick={onCerrar} />
            </div>
            <div className="modal-body">{children}</div>
            {pie && <div className="modal-footer">{pie}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
