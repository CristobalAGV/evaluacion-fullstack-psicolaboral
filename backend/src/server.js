import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import Archivo from "./models/Archivo.js";
import Candidato from "./models/Candidato.js";
import Oferta from "./models/Oferta.js";
import Solicitud from "./models/Solicitud.js";

const PORT = process.env.PORT || 4000;
if (!process.env.JWT_SECRET?.trim()) {
  console.error("Falta configurar JWT_SECRET para iniciar la API.");
  process.exit(1);
}

connectDB().then(async () => {
  await Promise.all([Archivo, Candidato, Oferta, Solicitud].map((modelo) => modelo.init()));
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
}).catch(() => {
  console.error("No se pudo preparar el almacenamiento de EA3. Revisa los permisos de colecciones e índices.");
  process.exit(1);
});
