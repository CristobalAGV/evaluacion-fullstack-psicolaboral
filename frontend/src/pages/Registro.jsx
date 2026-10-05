import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CampoPassword from "../components/CampoPassword";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("analista");
  const [error, setError] = useState("");
  const { registrarUsuario } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await registrarUsuario(nombre, correo, password, rol);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al registrar usuario");
    }
  }

  const campoClases =
    "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="max-w-md mx-auto mt-12 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Crear cuenta</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Nombre
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className={campoClases} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Correo
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required className={campoClases} />
        </label>
        <CampoPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
        />
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Rol
          <select value={rol} onChange={(e) => setRol(e.target.value)} className={campoClases}>
            <option value="analista">Analista</option>
            <option value="evaluador">Evaluador</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="mt-2 rounded-md bg-indigo-600 text-white font-medium py-2 text-sm hover:bg-indigo-500"
        >
          Registrarme
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
