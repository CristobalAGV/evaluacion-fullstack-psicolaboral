import { useNavigate } from "react-router-dom";
import SolicitudFormulario from "../components/SolicitudFormulario";

export default function NuevaSolicitud() {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
      <SolicitudFormulario alGuardar={() => navigate("/panel")} />
    </div>
  );
}
