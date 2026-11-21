import express from "express";
import swagger from "swagger-ui-dist";
import especificacion from "../openapi.js";

const router = express.Router();
router.get("/openapi.json", (req, res) => res.json(especificacion));
router.get("/", (req, res) => res.type("html").send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>API AquaChile</title><link rel="stylesheet" href="/api/docs/assets/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="/api/docs/assets/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:"/api/docs/openapi.json",dom_id:"#swagger-ui",validatorUrl:null});</script></body></html>`));
router.use("/assets", express.static(swagger.getAbsoluteFSPath(), { index: false }));
export default router;
