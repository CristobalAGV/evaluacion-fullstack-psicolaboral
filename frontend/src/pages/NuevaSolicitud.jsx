import { useNavigate } from "react-router-dom";
import SolicitudFormulario from "../components/SolicitudFormulario";

export default function NuevaSolicitud() {
  const navigate = useNavigate();

  return <SolicitudFormulario alGuardar={() => navigate("/")} />;
}
