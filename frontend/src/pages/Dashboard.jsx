import { useEffect, useState } from "react";
import { obtenerDashboard } from "../services/dashboardService";

const TARJETAS = [
  { clave: "totalCandidatos", titulo: "Total candidatos", borde: "border-dark" },
  { clave: "solicitudesPendientes", titulo: "Solicitudes pendientes", borde: "border-warning" },
  { clave: "solicitudesEnProceso", titulo: "Solicitudes en proceso", borde: "border-primary" },
  { clave: "solicitudesFinalizadas", titulo: "Solicitudes finalizadas", borde: "border-success" },
];

export default function Dashboard() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerDashboard()
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.mensaje || "Error al cargar el dashboard"))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary" role="status">
        <div className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="h3 mb-4">Dashboard</h1>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {datos && (
        <div className="row g-3">
          {TARJETAS.map((tarjeta) => (
            <div key={tarjeta.clave} className="col-12 col-md-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm overflow-hidden">
                <div className={`card-body border-top border-4 ${tarjeta.borde}`}>
                  <p className="text-secondary mb-1">{tarjeta.titulo}</p>
                  <p className="display-6 fw-bold mb-0">{datos[tarjeta.clave]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
