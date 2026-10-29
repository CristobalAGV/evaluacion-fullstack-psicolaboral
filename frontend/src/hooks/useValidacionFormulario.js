import { useState } from "react";

function mensajeDeValidez(campo) {
  const validez = campo.validity;
  if (validez.valueMissing) return "Este campo es obligatorio";
  if (validez.typeMismatch && campo.type === "email") return "Ingresa un correo válido";
  if (validez.tooShort) return `Ingresa al menos ${campo.minLength} caracteres`;
  return "El valor ingresado no es válido";
}

// Validación de formularios con las mismas reglas del HTML (required, minLength, type="email"...),
// pero mostrando el mensaje bajo cada campo en vez del globo del navegador. Se usa con
// <form noValidate>: los campos deben tener "name"; el campo inválido se marca con la clase
// "is-invalid" y su mensaje va en un <div className="invalid-feedback">.
export function useValidacionFormulario() {
  const [mensajes, setMensajes] = useState({});

  // Revisa todos los campos del formulario. Devuelve true si no hay ninguno inválido.
  function validar(formulario) {
    const nuevos = {};
    for (const campo of formulario.elements) {
      if (campo.name && campo.willValidate && !campo.validity.valid) nuevos[campo.name] = mensajeDeValidez(campo);
    }
    setMensajes(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  // Quita el mensaje de un campo cuando la persona vuelve a escribir en él.
  function limpiar(nombre) {
    setMensajes((actuales) => {
      if (!(nombre in actuales)) return actuales;
      const { [nombre]: _quitado, ...resto } = actuales;
      return resto;
    });
  }

  return { mensajes, validar, limpiar };
}
