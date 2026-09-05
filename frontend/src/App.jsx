import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Panel from './pages/Panel'
import NuevaSolicitud from './pages/NuevaSolicitud'
import './App.css'

function App() {
  return (
    <>
      <Navbar />
      <main className="contenido">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route
            path="/"
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
        </Routes>
      </main>
    </>
  )
}

export default App
