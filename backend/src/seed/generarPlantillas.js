import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANTILLAS_DIR = path.join(__dirname, "..", "..", "plantillas");

const PREGUNTAS_GENERALES = [
  "Cuénteme brevemente sobre su trayectoria laboral.",
  "¿Por qué decidió postular a este cargo?",
  "Describa una situación difícil que haya enfrentado en un trabajo anterior y cómo la resolvió.",
  "¿Cómo maneja el trabajo bajo presión o con plazos ajustados?",
  "¿Qué espera de este nuevo trabajo?",
];

const FAMILIAS = [
  {
    slug: "atencion-cliente",
    nombre: "Atención al Cliente",
    preguntasEspecificas: [
      "Relate una experiencia en la que haya tenido que atender a un cliente difícil o molesto.",
      "¿Cómo se asegura de entregar una buena experiencia al cliente en cada contacto?",
      "¿Qué hace cuando no tiene la solución inmediata a un reclamo?",
    ],
  },
  {
    slug: "ventas",
    nombre: "Ventas",
    preguntasEspecificas: [
      "Describa su proceso habitual para cerrar una venta.",
      "Cuénteme sobre la venta más difícil que haya logrado concretar.",
      "¿Cómo maneja el rechazo o la negativa de un cliente potencial?",
    ],
  },
  {
    slug: "administracion",
    nombre: "Administración",
    preguntasEspecificas: [
      "¿Cómo organiza sus tareas cuando tiene múltiples pendientes administrativos?",
      "Cuénteme sobre su experiencia manejando documentación o procesos internos.",
      "¿Qué herramientas o sistemas administrativos domina?",
    ],
  },
  {
    slug: "operaciones",
    nombre: "Operaciones",
    preguntasEspecificas: [
      "Cuénteme sobre su experiencia coordinando procesos operativos o logísticos.",
      "¿Cómo reacciona ante un imprevisto que afecta la operación del día?",
      "Describa una mejora que haya propuesto en un proceso operativo.",
    ],
  },
];

async function generarPlantillaInforme(familia, carpeta) {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Informe");

  hoja.columns = [
    { header: "Nombre", key: "nombre", width: 25 },
    { header: "Cargo", key: "cargo", width: 25 },
    { header: "Fortalezas", key: "fortalezas", width: 40 },
    { header: "Áreas de mejora", key: "areasMejora", width: 40 },
    { header: "Conclusión", key: "conclusion", width: 40 },
  ];

  hoja.getRow(1).font = { bold: true };

  hoja.addRow({
    nombre: "",
    cargo: familia.nombre,
    fortalezas: "",
    areasMejora: "",
    conclusion: "",
  });

  const destino = path.join(carpeta, "plantilla_informe.xlsx");
  await workbook.xlsx.writeFile(destino);
}

async function generarPautaEntrevista(familia, carpeta) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(`Pauta de Entrevista - ${familia.nombre}`)],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: "Nombre del candidato: ______________________" })] }),
          new Paragraph({ children: [new TextRun({ text: "Cargo postulado: ______________________" })] }),
          new Paragraph({ children: [new TextRun({ text: "Fecha: ______________________" })] }),
          new Paragraph({ children: [new TextRun({ text: "Entrevistador: ______________________" })] }),
          new Paragraph({ text: "" }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Preguntas generales")],
          }),
          ...PREGUNTAS_GENERALES.map(
            (pregunta, indice) => new Paragraph({ text: `${indice + 1}. ${pregunta}` })
          ),
          new Paragraph({ text: "" }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(`Preguntas específicas: ${familia.nombre}`)],
          }),
          ...familia.preguntasEspecificas.map(
            (pregunta, indice) => new Paragraph({ text: `${indice + 1}. ${pregunta}` })
          ),
          new Paragraph({ text: "" }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("Observaciones del entrevistador")],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
        ],
      },
    ],
  });

  const destino = path.join(carpeta, "pauta_entrevista.docx");
  const buffer = await Packer.toBuffer(doc);
  await fs.promises.writeFile(destino, buffer);
}

async function generar() {
  for (const familia of FAMILIAS) {
    const carpeta = path.join(PLANTILLAS_DIR, familia.slug);
    await fs.promises.mkdir(carpeta, { recursive: true });
    await generarPlantillaInforme(familia, carpeta);
    await generarPautaEntrevista(familia, carpeta);
    console.log(`Plantillas generadas para: ${familia.nombre}`);
  }
  console.log("Generación de plantillas completada.");
}

generar().catch((error) => {
  console.error("Error al generar plantillas:", error.message);
  process.exit(1);
});
