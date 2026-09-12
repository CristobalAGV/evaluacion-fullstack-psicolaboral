import { useEffect, useState } from "react";
import { obtenerDashboard } from "../services/dashboardService";

const TARJETAS = [
  { clave: "totalCandidatos", titulo: "Total candidatos", color: "bg-slate-800" },
  { clave: "solicitudesPendientes", titulo: "Solicitudes pendientes", color: "bg-amber-500" },
  { clave: "solicitudesEnProceso", titulo: "Solicitudes en proceso", color: "bg-blue-500" },
  { clave: "solicitudesFinalizadas", titulo: "Solicitudes finalizadas", color: "bg-emerald-600" },
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

  if (cargando) return <p className="text-sm text-slate-500">Cargando dashboard...</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-5">Dashboard</h2>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {datos && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TARJETAS.map((tarjeta) => (
            <div key={tarjeta.clave} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className={`h-1.5 ${tarjeta.color}`} />
              <div className="p-5">
                <p className="text-sm text-slate-500">{tarjeta.titulo}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{datos[tarjeta.clave]}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
