import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

export async function registrar(req, res) {
  try {
    const { nombre, correo, password, rol } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ mensaje: "Nombre, correo y password son obligatorios" });
    }

    const existente = await Usuario.findOne({ correo });
    if (existente) {
      return res.status(409).json({ mensaje: "Ya existe un usuario con ese correo" });
    }

    const usuario = await Usuario.create({ nombre, correo, password, rol });
    const token = generarToken(usuario);

    return res.status(201).json({
      usuario: { id: usuario._id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
      token,
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al registrar usuario", error: error.message });
  }
}

export async function login(req, res) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ mensaje: "Correo y password son obligatorios" });
    }

    const usuario = await Usuario.findOne({ correo }).select("+password");
    if (!usuario) {
      return res.status(401).json({ mensaje: "Credenciales invalidas" });
    }

    const passwordValida = await usuario.compararPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: "Credenciales invalidas" });
    }

    const token = generarToken(usuario);

    return res.json({
      usuario: { id: usuario._id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
      token,
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al iniciar sesion", error: error.message });
  }
}

export async function perfil(req, res) {
  const usuario = await Usuario.findById(req.usuario.id);
  if (!usuario) {
    return res.status(404).json({ mensaje: "Usuario no encontrado" });
  }
  return res.json({ id: usuario._id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol });
}
