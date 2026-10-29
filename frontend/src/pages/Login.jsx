import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CampoPassword from "../components/CampoPassword";

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
    <div className="row justify-content-center">
      <div className="col-12 col-sm-10 col-md-8 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-4">Iniciar sesión</h1>
            {mensajeSesion && (
              <div className="alert alert-warning" role="alert">
                {mensajeSesion}
              </div>
            )}
            <form onSubmit={handleSubmit} className="d-grid gap-3">
              <div>
                <label htmlFor="login-correo" className="form-label">
                  Correo
                </label>
                <input
                  id="login-correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
              <CampoPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary">
                Ingresar
              </button>
            </form>
            <p className="mt-4 mb-2 small text-body-secondary">
              ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
            </p>
            <p className="mb-0 small text-body-secondary">
              ¿Quieres postular a un cargo? <Link to="/postular">Postula aquí</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
