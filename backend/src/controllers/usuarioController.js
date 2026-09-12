import Usuario from "../models/Usuario.js";

export async function listarUsuarios(req, res) {
  try {
    const filtro = {};
    if (req.query.rol) filtro.rol = req.query.rol;

    const usuarios = await Usuario.find(filtro).select("nombre correo rol").sort({ nombre: 1 });
    return res.json(usuarios);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al listar usuarios", error: error.message });
  }
}
