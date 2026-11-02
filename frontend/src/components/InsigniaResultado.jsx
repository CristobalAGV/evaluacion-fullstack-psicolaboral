// Resultado final de una solicitud finalizada. Colores suaves, como el resto del panel.
const ESTILOS = {
  Aprobada: { backgroundColor: "#cfe8d9", color: "#1f5a3c" },
  Rechazada: { backgroundColor: "#f1d3d3", color: "#7a2e2e" },
};

function estiloResultado(resultado) {
  return ESTILOS[resultado] || { backgroundColor: "#e2e6ea", color: "#495057" };
}

export default function InsigniaResultado({ resultado }) {
  if (!resultado) return null;
  return (
    <span className="badge" style={estiloResultado(resultado)}>
      {resultado}
    </span>
  );
}
