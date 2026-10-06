// Configuración de Karma + Jasmine para las pruebas unitarias del frontend.
//
// - Las pruebas viven en src/pruebas/*.spec.js y corren en Chrome sin interfaz (ChromeHeadless).
//   Usan extensión .js (con JSX adentro) porque karma-esbuild exige que los archivos de entrada
//   de prueba terminen en .js.
// - karma-esbuild compila JSX y módulos ES (React 19) al vuelo. Se eligió en vez de karma-vite
//   porque karma-vite solo soporta Vite 2 a 5 y este proyecto usa Vite 8.
// - Con --cobertura (script "test:cobertura") un plugin de esbuild instrumenta el código de src/
//   con istanbul; karma-coverage recoge el resultado y genera los reportes en coverage/.
const fs = require("node:fs");
const path = require("node:path");
const { createInstrumenter } = require("istanbul-lib-instrument");

// Se activa con un flag de línea de comandos (y no con una variable de entorno) para que el
// script funcione igual en Windows, macOS y Linux sin dependencias extra.
const conCobertura = process.argv.includes("--cobertura");
const CARPETA_SRC = path.join(__dirname, "src");
const CARPETA_PRUEBAS = path.join(CARPETA_SRC, "pruebas");

// Instrumenta los archivos de la app (no las pruebas) para medir qué líneas se ejecutan.
function pluginCobertura() {
  const instrumentador = createInstrumenter({ esModules: true, parserPlugins: ["jsx", "importMeta"] });
  return {
    name: "cobertura-istanbul",
    setup(build) {
      build.onLoad({ filter: /\.(js|jsx)$/ }, async (args) => {
        const esDeLaApp = args.path.startsWith(CARPETA_SRC) && !args.path.startsWith(CARPETA_PRUEBAS);
        if (!esDeLaApp) return undefined;
        const codigo = await fs.promises.readFile(args.path, "utf8");
        return {
          contents: instrumentador.instrumentSync(codigo, args.path),
          loader: args.path.endsWith(".jsx") ? "jsx" : "js",
        };
      });
    },
  };
}

module.exports = function configurar(config) {
  config.set({
    frameworks: ["jasmine"],
    files: [{ pattern: "src/pruebas/**/*.spec.js", watched: false }],
    preprocessors: { "src/pruebas/**/*.spec.js": ["esbuild"] },

    esbuild: {
      jsx: "automatic",
      loader: { ".js": "jsx" },
      target: "es2022",
      // Variables que Vite inyecta en la app; en las pruebas se fijan a valores conocidos.
      define: {
        "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:4000/api"),
        "process.env.NODE_ENV": JSON.stringify("development"),
      },
      sourcemap: true,
      plugins: conCobertura ? [pluginCobertura()] : [],
    },

    reporters: conCobertura ? ["progress", "coverage"] : ["progress"],
    coverageReporter: {
      dir: "coverage",
      reporters: [
        { type: "html", subdir: "html" },
        { type: "json-summary", subdir: ".", file: "coverage-summary.json" },
        { type: "text" },
        { type: "text-summary" },
      ],
    },

    browsers: ["ChromeHeadless"],
    singleRun: true,
    autoWatch: false,
    browserNoActivityTimeout: 60000,
    client: { jasmine: { random: true } },
  });
};
