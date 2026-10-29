import { Routes, Route, Outlet } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Navbar from './components/Navbar'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'
import Panel from './pages/Panel'
import NuevaSolicitud from './pages/NuevaSolicitud'
import SolicitudDetalle from './pages/SolicitudDetalle'
import Postular from './pages/Postular'
import NotFoundPage from './pages/NotFoundPage'

// Marco provisional de las páginas públicas (todavía con Tailwind): barra de navegación y
// contenedor centrado, como antes del layout. La postulación pública va sin barra del equipo.
function MarcoPublico({ conNavbar = true }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {conNavbar && <Navbar />}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<MarcoPublico />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<MarcoPublico conNavbar={false} />}>
        <Route path="/postular" element={<Postular />} />
      </Route>
      {/* Zona privada: sin sesión se redirige a /login; cada ruta con roles lo vuelve a exigir. */}
      <Route
        element={
          <RutaProtegida>
            <AppLayout />
          </RutaProtegida>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/panel" element={<Panel />} />
        <Route
          path="/solicitudes/nueva"
          element={
            <RutaProtegida roles={['analista', 'admin']}>
              <NuevaSolicitud />
            </RutaProtegida>
          }
        />
        <Route path="/solicitudes/:id" element={<SolicitudDetalle />} />
      </Route>
    </Routes>
  )
}

export default App
