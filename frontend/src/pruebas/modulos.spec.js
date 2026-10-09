// Prueba de humo: todos los módulos de la app cargan sin errores y exportan lo esperado.
// Además hace que el reporte de cobertura incluya los archivos que todavía no tienen pruebas
// propias (aparecen con su porcentaje real en vez de quedar fuera del reporte).
// main.jsx no se importa porque monta la app en el #root de index.html.
import App from "../App";
import ArchivoDescargable from "../components/ArchivoDescargable";
import EtiquetaPostulacionPublica from "../components/EtiquetaPostulacionPublica";
import Navbar from "../components/Navbar";
import RutaProtegida from "../components/RutaProtegida";
import SelectorCv from "../components/SelectorCv";
import SolicitudFormulario from "../components/SolicitudFormulario";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";
import NuevaSolicitud from "../pages/NuevaSolicitud";
import Panel from "../pages/Panel";
import Postular from "../pages/Postular";
import Registro from "../pages/Registro";
import SolicitudDetalle from "../pages/SolicitudDetalle";
import * as archivoService from "../services/archivoService";
import * as authService from "../services/authService";
import * as dashboardService from "../services/dashboardService";
import * as evaluacionService from "../services/evaluacionService";
import * as familiaService from "../services/familiaService";
import * as postulacionService from "../services/postulacionService";
import * as solicitudService from "../services/solicitudService";
import * as usuarioService from "../services/usuarioService";

describe("Módulos de la aplicación", () => {
  it("todos los componentes y páginas se pueden importar", () => {
    const componentes = [
      App, ArchivoDescargable, EtiquetaPostulacionPublica, Navbar, RutaProtegida, SelectorCv,
      SolicitudFormulario, AuthProvider, Dashboard, Login, NuevaSolicitud, Panel, Postular,
      Registro, SolicitudDetalle,
    ];

    for (const componente of componentes) {
      expect(typeof componente).withContext(componente?.name).toBe("function");
    }
    expect(typeof useAuth).toBe("function");
  });

  it("los servicios exponen sus funciones de acceso a la API", () => {
    expect(typeof archivoService.descargarArchivo).toBe("function");
    expect(typeof authService.login).toBe("function");
    expect(typeof dashboardService.obtenerDashboard).toBe("function");
    expect(typeof evaluacionService.crearEvaluacion).toBe("function");
    expect(typeof familiaService.listarFamilias).toBe("function");
    expect(typeof postulacionService.enviarPostulacion).toBe("function");
    expect(typeof solicitudService.listarSolicitudes).toBe("function");
    expect(typeof usuarioService.listarUsuarios).toBe("function");
  });
});
