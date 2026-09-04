import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await iniciarSesion(correo, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al iniciar sesion");
    }
  }

  return (
    <div className="auth-form">
      <h2>Iniciar sesion</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Correo
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Ingresar</button>
      </form>
      <p>
        No tenes cuenta? <Link to="/registro">Registrate</Link>
      </p>
    </div>
  );
}
