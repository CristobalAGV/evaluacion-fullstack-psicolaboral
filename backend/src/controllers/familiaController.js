import FamiliaDeCargo from "../models/FamiliaDeCargo.js";

export async function listarFamilias(req, res) {
  try {
    const familias = await FamiliaDeCargo.find().sort({ nombre: 1 });
    return res.json(familias);
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al listar familias de cargo", error: error.message });
  }
}
