import jwt from "jsonwebtoken";

export function verificarToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

// true si el usuario es el evaluador responsable de la solicitud (poblada o no).
export function esEvaluadorResponsable(usuario, solicitud) {
  const responsable = solicitud.profesionalResponsable?._id ?? solicitud.profesionalResponsable;
  return usuario?.rol === "evaluador" && Boolean(responsable) && String(responsable) === String(usuario.id);
}

export function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tiene permisos para realizar esta acción" });
    }
    next();
  };
}
