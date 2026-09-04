import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { usuario } = useAuth();

  return (
    <div className="dashboard">
      <h2>Bienvenido, {usuario?.nombre}</h2>
      <p>Rol: {usuario?.rol}</p>
      <p>
        Este es el esqueleto inicial del sistema de evaluacion psicolaboral. Aca iran los modulos de
        solicitudes, entrevistas e informes.
      </p>
    </div>
  );
}
