import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import PublicLayout from './layouts/PublicLayout'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'
import Panel from './pages/Panel'
import NuevaSolicitud from './pages/NuevaSolicitud'
import SolicitudDetalle from './pages/SolicitudDetalle'
import Postular from './pages/Postular'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  const { usuario } = useAuth()

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
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
      {/* 404: con sesión se ve dentro del marco privado; sin sesión, dentro del público. */}
      <Route path="*" element={usuario ? <AppLayout /> : <PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
