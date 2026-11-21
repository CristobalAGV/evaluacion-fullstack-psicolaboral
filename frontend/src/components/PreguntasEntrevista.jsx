import { useState } from "react";
import { generarPreguntasEntrevista } from "../services/informeService";

export default function PreguntasEntrevista({ id }) {
  const [estado, setEstado] = useState({});

  async function generar() {
    setEstado({ cargando: true });
    try {
      setEstado({ resultado: await generarPreguntasEntrevista(id) });
    } catch (error) {
      setEstado({ error: error.response?.data?.mensaje || "No se pudieron generar las preguntas." });
    }
  }

  return <section className="card shadow-sm mb-3">
    <div className="card-body">
      <h2 className="h5">Preguntas para entrevista con IA</h2>
      <p>Usa cargos ficticios para la demostración. Gemini recibe el cargo y su familia. Revisa cada pregunta antes de usarla, ya que puede ser imprecisa o poco pertinente. La decisión de selección es humana.</p>
      <button className="btn btn-outline-primary" onClick={generar} disabled={estado.cargando}>
        {estado.cargando ? "Generando…" : "Sugerir preguntas"}
      </button>
      {estado.error && <p className="alert alert-danger mt-3 mb-0" role="alert">{estado.error}</p>}
      {estado.resultado && <ul className="mt-3 mb-0">
        {estado.resultado.preguntas.map((pregunta, indice) => <li key={indice}>{pregunta}</li>)}
      </ul>}
    </div>
  </section>;
}
