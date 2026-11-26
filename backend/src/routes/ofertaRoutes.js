import { Router } from "express";
import mongoose from "mongoose";
import Oferta, { CAMPOS_OFERTA, CAMPOS_PROFESIONALES, MODALIDADES } from "../models/Oferta.js";
import FamiliaDeCargo from "../models/FamiliaDeCargo.js";
import { verificarToken, permitirRoles } from "../middleware/auth.js";
import { validarCamposPreseleccion, exclusiones, deseables } from "../utils/preseleccion.js";

const router = Router();
const filtroPublico = { estado: "publicada" };
const noEncontrada = (res) => res.status(404).json({ mensaje: "Oferta no encontrada" });

function manejar(operacion) {
  return async (req, res) => {
    try {
      return await operacion(req, res);
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ mensaje: "Datos de oferta inválidos" });
      }
      return res.status(500).json({ mensaje: "No se pudo completar la operación de ofertas" });
    }
  };
}

const listar = (base) => manejar(async (req, res) => {
  const filtro = { ...base };
  const { q, familia, area, region, modalidad } = req.query;
  if (q !== undefined && (typeof q !== "string" || q.length > 100)) {
    return res.status(400).json({ mensaje: "Búsqueda inválida" });
  }
  if (familia !== undefined && !mongoose.isObjectIdOrHexString(familia)) {
    return res.status(400).json({ mensaje: "Familia inválida" });
  }
  if (familia) filtro.familiaDeCargo = familia;
  for (const [campo, valor] of Object.entries({ area, region })) {
    if (valor === undefined) continue;
    if (typeof valor !== "string" || !valor.trim() || valor.length > CAMPOS_PROFESIONALES[campo]) {
      return res.status(400).json({ mensaje: `Filtro de ${campo} inválido` });
    }
    filtro[campo] = valor.trim();
  }
  if (modalidad !== undefined) {
    if (!MODALIDADES.includes(modalidad)) return res.status(400).json({ mensaje: "Modalidad inválida" });
    filtro.modalidad = modalidad;
  }
  if (q?.trim()) {
    const patron = new RegExp(q.trim().replace(/[.*+?^$(){}|[\]\\]/g, "\\$&"), "i");
    filtro.$or = ["cargo", "ubicacion", "descripcion", "area", "region", "objetivo", "conocimientos"]
      .map((campo) => ({ [campo]: patron }));
  }
  return res.json(await Oferta.find(filtro).populate("familiaDeCargo", "nombre")
    .sort({ fechaPublicacion: -1, createdAt: -1 }));
});

const detalle = (base) => manejar(async (req, res) => {
  const oferta = await Oferta.findOne({ ...base, _id: req.params.id }).populate("familiaDeCargo", "nombre");
  return oferta ? res.json(oferta) : noEncontrada(res);
});

const guardar = (editar) => manejar(async (req, res) => {
  const { familiaDeCargo, modalidad, cupos } = req.body ?? {};
  const campos = { familiaDeCargo, modalidad, cupos };
  try {
    if (req.body?.requisitosEstructurados !== undefined) campos.requisitosEstructurados =
      validarCamposPreseleccion(req.body.requisitosEstructurados, exclusiones);
    if (req.body?.requisitosDeseables !== undefined) campos.requisitosDeseables =
      validarCamposPreseleccion(req.body.requisitosDeseables, deseables);
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
  for (const [campo, maximo] of Object.entries(CAMPOS_OFERTA)) {
    const valor = req.body?.[campo];
    if (typeof valor !== "string" || !valor.trim() || valor.length > maximo) {
      return res.status(400).json({ mensaje: `Revisa el campo ${campo}` });
    }
    campos[campo] = valor.trim();
  }
  for (const [campo, maximo] of Object.entries(CAMPOS_PROFESIONALES)) {
    const valor = req.body?.[campo];
    if (valor === undefined) continue;
    if (typeof valor !== "string" || valor.length > maximo) {
      return res.status(400).json({ mensaje: `Revisa el campo ${campo}` });
    }
    campos[campo] = valor.trim();
  }
  if (!MODALIDADES.includes(modalidad) || !Number.isInteger(cupos) || cupos < 1 || cupos > 10000) {
    return res.status(400).json({ mensaje: "Modalidad o cupos inválidos" });
  }
  if (!mongoose.isObjectIdOrHexString(familiaDeCargo) || !(await FamiliaDeCargo.exists({ _id: familiaDeCargo }))) {
    return res.status(400).json({ mensaje: "Selecciona una familia existente" });
  }
  if (!editar) return res.status(201).json(await Oferta.create(campos));
  const oferta = await Oferta.findOneAndUpdate(
    { _id: req.params.id, estado: { $ne: "archivada" } }, campos,
    { returnDocument: "after", runValidators: true },
  );
  return oferta ? res.json(oferta) : noEncontrada(res);
});

const cambiarEstado = manejar(async (req, res) => {
  const { publicada } = req.body ?? {};
  if (typeof publicada !== "boolean") return res.status(400).json({ mensaje: "Indica si la oferta se publica" });
  const oferta = await Oferta.findOneAndUpdate(
    { _id: req.params.id, estado: { $ne: "archivada" } },
    [{ $set: {
      estado: publicada ? "publicada" : "borrador",
      fechaPublicacion: publicada
        ? { $cond: [{ $eq: ["$estado", "publicada"] }, "$fechaPublicacion", "$$NOW"] }
        : "$fechaPublicacion",
    } }],
    { returnDocument: "after", updatePipeline: true },
  );
  return oferta ? res.json(oferta) : noEncontrada(res);
});

router.param("id", (req, res, next, id) => mongoose.isObjectIdOrHexString(id) ? next() : noEncontrada(res));
router.get("/publicas", listar(filtroPublico));
router.get("/publicas/:id", detalle(filtroPublico));
router.use(verificarToken, permitirRoles("admin", "analista"));
router.get("/", listar({}));
router.post("/", guardar(false));
router.get("/:id", detalle({}));
router.put("/:id", guardar(true));
router.patch("/:id/publicacion", cambiarEstado);
router.delete("/:id", manejar(async (req, res) => {
  const oferta = await Oferta.findByIdAndUpdate(req.params.id, { estado: "archivada" });
  return oferta ? res.status(204).end() : noEncontrada(res);
}));

export default router;
