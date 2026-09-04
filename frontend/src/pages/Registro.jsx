import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  return (
    <div className="auth-form">
      <h2>Crear cuenta</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Correo
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <label>
          Rol
          <select value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="analista">Analista</option>
            <option value="psicologo">Psicologo</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Registrarme</button>
      </form>
      <p>
        Ya tenes cuenta? <Link to="/login">Iniciar sesion</Link>
      </p>
    </div>
  );
}
