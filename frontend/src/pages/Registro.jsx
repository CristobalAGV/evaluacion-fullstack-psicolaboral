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

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-sm-10 col-md-8 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-4">Crear cuenta</h1>
            <form onSubmit={handleSubmit} className="d-grid gap-3">
              <div>
                <label htmlFor="registro-nombre" className="form-label">
                  Nombre
                </label>
                <input
                  id="registro-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
              <div>
                <label htmlFor="registro-correo" className="form-label">
                  Correo
                </label>
                <input
                  id="registro-correo"
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
                autoComplete="new-password"
                minLength={6}
              />
              <div>
                <label htmlFor="registro-rol" className="form-label">
                  Rol
                </label>
                <select
                  id="registro-rol"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="form-select"
                >
                  <option value="analista">Analista</option>
                  <option value="evaluador">Evaluador</option>
                </select>
              </div>
              {error && (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary">
                Registrarme
              </button>
            </form>
            <p className="mt-4 mb-0 small text-body-secondary">
              ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
