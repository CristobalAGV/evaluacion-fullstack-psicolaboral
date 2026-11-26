import { useState } from "react";
import api from "../services/api";
import { estadosPreseleccion, requiereContinuidad } from "../config/preseleccion";
import { leerCamposPreseleccion } from "../config/camposPreseleccion";
import CamposPreseleccion from "./CamposPreseleccion";

const grupos = [
  ["requisitosCumplidos", "Requisitos cumplidos"],
  ["requisitosNoCumplidos", "Requisitos no cumplidos"],
  ["requisitosSinInformacion", "Información pendiente"],
];

export default function PreseleccionDetalle({ id, resultado, permiteRecalcular, puedeGestionar, onActualizar }) {
  const [accion, setAccion] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [trazabilidad, setTrazabilidad] = useState(null);
  const [errorConsulta, setErrorConsulta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [corregir, setCorregir] = useState(false);
  const estado = estadosPreseleccion[resultado?.estadoPreseleccion];

  async function consultar() {
    setConsultando(true);
    setErrorConsulta("");
    try {
      const { data } = await api.get(`/solicitudes/${id}/preseleccion`);
      setTrazabilidad(data);
      return true;
    } catch (err) {
      setErrorConsulta(err.response?.data?.mensaje || "No se pudo consultar la trazabilidad.");
      return false;
    } finally {
      setConsultando(false);
    }
  }

  async function confirmar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const antecedentes = corregir ? leerCamposPreseleccion(new FormData(evento.currentTarget), "antecedentes") : undefined;
      const { data } = await api.post(`/solicitudes/${id}/preseleccion/${accion}`, { motivo: motivo.trim(), ...(corregir && { antecedentes }) });
      onActualizar(data.preseleccion);
      setAccion("");
      setMotivo("");
      setCorregir(false);
      setTrazabilidad(null);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo actualizar la preselección.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card shadow-sm mb-3" aria-labelledby="titulo-preseleccion">
      <div className="card-body">
        <h2 className="h6 fw-semibold" id="titulo-preseleccion">Preselección de requisitos</h2>
        <p className="small text-secondary">Esta preselección se basa en criterios objetivos definidos en la oferta. No constituye una decisión automática de contratación.</p>
        {estado ? (
          <>
            <p className="d-flex gap-2 align-items-center">
              <span className={`badge text-bg-${estado.color}`}>{estado.nombre}</span>
              <strong>{resultado.porcentajeCoincidencia}% coincidencia</strong>
            </p>
            <div className="row">
              {grupos.map(([campo, titulo]) => (
                <div key={campo} className="col-md-4">
                  <h3 className="h6">{titulo}</h3>
                  {resultado[campo]?.length ? <ul>{resultado[campo].map((criterio) => <li key={criterio}>{criterio}</li>)}</ul> : <p className="small text-secondary">Ninguno</p>}
                </div>
              ))}
            </div>
            {resultado.estadoPreseleccion === "no_cumple" && (
              <p className="alert alert-warning">El postulante no cumple uno o más requisitos excluyentes. La evaluación con IA no es necesaria salvo revisión manual.</p>
            )}
            {requiereContinuidad(resultado) && <p className="small">Un analista o administrador debe registrar la continuidad antes de usar las funciones de IA.</p>}
            {resultado.continuidad && <p className="small">Continuidad autorizada. Motivo: {resultado.continuidad.motivo}</p>}
          </>
        ) : <p className="small text-secondary">No hay una preselección registrada para esta solicitud.</p>}
        {resultado && !accion && (
          <button type="button" className="btn btn-sm btn-link px-0" disabled={consultando} onClick={trazabilidad ? () => setTrazabilidad(null) : consultar}>
            {trazabilidad ? "Ocultar trazabilidad" : "Ver antecedentes y trazabilidad"}
          </button>
        )}
        {errorConsulta && <p role="alert" className="text-danger">{errorConsulta}</p>}
        {trazabilidad && !accion && (
          <div className="border rounded p-2 mb-2">
            <fieldset disabled>
              <legend className="h6">Antecedentes declarados</legend>
              <CamposPreseleccion grupo="antecedentes" datos={trazabilidad.antecedentes} />
            </fieldset>
            <h3 className="h6 mt-2">Recálculos registrados</h3>
            {trazabilidad.historial.length ? <ul className="small mb-0">{trazabilidad.historial.map((registro, indice) => (
              <li key={indice}>{new Date(registro.fecha).toLocaleString("es-CL")} · {registro.motivo} · Resultado previo: {estadosPreseleccion[registro.resultadoAnterior?.estadoPreseleccion]?.nombre ?? "Sin preselección"}</li>
            ))}</ul> : <p className="small mb-0">Sin recálculos previos.</p>}
          </div>
        )}
        {puedeGestionar && !accion && (
          <div className="d-flex flex-wrap gap-2">
            {requiereContinuidad(resultado) && <button type="button" className="btn btn-sm btn-primary" onClick={() => setAccion("continuar")}>Continuar a evaluación</button>}
            {permiteRecalcular && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAccion("recalcular")}>Recalcular preselección</button>}
          </div>
        )}
        {puedeGestionar && accion && (
          <form onSubmit={confirmar}>
            <label className="form-label" htmlFor="motivo-preseleccion">Motivo</label>
            <textarea id="motivo-preseleccion" className="form-control mb-2" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} required maxLength={500} />
            {accion === "recalcular" && <p className="small text-secondary">Se usarán los requisitos actuales de la oferta y se guardará el resultado previo en el historial.</p>}
            {accion === "recalcular" && !corregir && <button type="button" className="btn btn-sm btn-outline-secondary mb-2" disabled={consultando}
              onClick={async () => {
                if (trazabilidad || await consultar()) setCorregir(true);
              }}>Corregir antecedentes declarados</button>}
            {accion === "recalcular" && corregir && trazabilidad && (
              <fieldset className="mb-2">
                <legend className="h6">Corrección de antecedentes</legend>
                <CamposPreseleccion grupo="antecedentes" datos={trazabilidad.antecedentes} />
              </fieldset>
            )}
            {error && <p role="alert" className="text-danger">{error}</p>}
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-primary" disabled={guardando || consultando || !motivo.trim()}>{accion === "continuar" ? "Autorizar continuidad" : "Confirmar recálculo"}</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={guardando || consultando} onClick={() => { setAccion(""); setMotivo(""); setError(""); setCorregir(false); }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
