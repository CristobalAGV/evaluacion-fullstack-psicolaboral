import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <p className="display-1 fw-bold text-body-secondary mb-0">404</p>
      <h1 className="h4 mb-3">Página no encontrada</h1>
      <p className="text-body-secondary">La dirección que buscas no existe o fue movida.</p>
      <Link to="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}
