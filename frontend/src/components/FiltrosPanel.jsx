import { hayFiltrosActivos } from "../utils/filtrosPanel";

// Barra de búsqueda y filtros del Panel. Es controlada: el estado vive en el Panel.
export default function FiltrosPanel({ filtros, areas, responsables, onCambiar, onLimpiar }) {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-lg-4">
            <label htmlFor="filtro-busqueda" className="form-label small mb-1">
              Buscar
            </label>
            <div className="input-group">
              <span className="input-group-text" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                </svg>
              </span>
              <input
                id="filtro-busqueda"
                type="search"
                value={filtros.busqueda}
                onChange={(e) => onCambiar("busqueda", e.target.value)}
                placeholder="Candidato o cargo"
                className="form-control"
              />
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="filtro-area" className="form-label small mb-1">
              Área
            </label>
            <select
              id="filtro-area"
              value={filtros.area}
              onChange={(e) => onCambiar("area", e.target.value)}
              className="form-select"
            >
              <option value="">Todas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="filtro-responsable" className="form-label small mb-1">
              Responsable
            </label>
            <select
              id="filtro-responsable"
              value={filtros.responsable}
              onChange={(e) => onCambiar("responsable", e.target.value)}
              className="form-select"
            >
              <option value="">Todos</option>
              {responsables.map((responsable) => (
                <option key={responsable} value={responsable}>
                  {responsable}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6 col-lg-2">
            <label htmlFor="filtro-origen" className="form-label small mb-1">
              Origen
            </label>
            <select
              id="filtro-origen"
              value={filtros.origen}
              onChange={(e) => onCambiar("origen", e.target.value)}
              className="form-select"
            >
              <option value="todas">Todas</option>
              <option value="publica">Postulación pública</option>
              <option value="analista">Creadas por el analista</option>
            </select>
          </div>
          {hayFiltrosActivos(filtros) && (
            <div className="col-12 col-md-6 col-lg-auto">
              <button type="button" onClick={onLimpiar} className="btn btn-outline-secondary w-100">
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
