import { useNavigate } from "react-router-dom";
import SolicitudFormulario from "../components/SolicitudFormulario";

export default function NuevaSolicitud() {
  const navigate = useNavigate();

  return (
    <div className="row">
      <div className="col-12 col-xl-8">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <SolicitudFormulario alGuardar={() => navigate("/panel")} />
          </div>
        </div>
      </div>
    </div>
  );
}
