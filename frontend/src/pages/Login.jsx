import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { iniciarSesion, mensajeSesion } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await iniciarSesion(correo, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al iniciar sesión");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Iniciar sesión</h2>
      {mensajeSesion && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {mensajeSesion}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="mt-2 rounded-md bg-indigo-600 text-white font-medium py-2 text-sm hover:bg-indigo-500"
        >
          Ingresar
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <Link to="/registro" className="text-indigo-600 hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
