import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'
import Panel from './pages/Panel'
import NuevaSolicitud from './pages/NuevaSolicitud'
import SolicitudDetalle from './pages/SolicitudDetalle'
import Postular from './pages/Postular'

// Páginas públicas que no deben mostrar la barra de navegación del equipo.
const RUTAS_SIN_NAVBAR = ['/postular']

function App() {
  const { pathname } = useLocation()
  const mostrarNavbar = !RUTAS_SIN_NAVBAR.includes(pathname)

  return (
    <div className="min-h-screen bg-slate-50">
      {mostrarNavbar && <Navbar />}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/postular" element={<Postular />} />
          <Route
            path="/"
            element={
              <RutaProtegida>
                <Dashboard />
              </RutaProtegida>
            }
          />
          <Route
            path="/panel"
            element={
              <RutaProtegida>
                <Panel />
              </RutaProtegida>
            }
          />
          <Route
            path="/solicitudes/nueva"
            element={
              <RutaProtegida>
                <NuevaSolicitud />
              </RutaProtegida>
            }
          />
          <Route
            path="/solicitudes/:id"
            element={
              <RutaProtegida>
                <SolicitudDetalle />
              </RutaProtegida>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
