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
      <p>Estas preguntas ayudan a comprobar antecedentes laborales durante la entrevista. Las respuestas deben ser verificadas por el evaluador y no modifican automáticamente la preselección. La decisión de selección es humana.</p>
      <button className="btn btn-outline-primary" onClick={generar} disabled={estado.cargando}>
        {estado.cargando ? "Generando…" : "Sugerir preguntas"}
      </button>
      {estado.error && <p className="alert alert-danger mt-3 mb-0" role="alert">{estado.error}</p>}
      {estado.resultado?.aviso && <p className="alert alert-warning mt-3 mb-0" role="status">{estado.resultado.aviso}</p>}
      {estado.resultado?.preguntas?.length > 0 && <div className="mt-3">
        <h3 className="h6">Preguntas generales</h3>
        <ul className="mb-0">{estado.resultado.preguntas.map((pregunta) => <li key={pregunta}>{pregunta}</li>)}</ul>
      </div>}
      {estado.resultado?.preguntasVerificacion?.length > 0 && <div className="mt-3">
        <h3 className="h6">Preguntas para verificar requisitos</h3>
        <ul className="mb-0">
          {estado.resultado.preguntasVerificacion.map(({ requisito, motivo, pregunta }) => (
            <li key={requisito} className="mb-2">
              <span className="small text-secondary">{requisito} · {motivo}</span>
              <div>{pregunta}</div>
            </li>
          ))}
        </ul>
      </div>}
    </div>
  </section>;
}
