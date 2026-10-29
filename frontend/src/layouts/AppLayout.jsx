import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import "./AppLayout.css";

// Marco de la zona privada: barra superior, menú lateral, contenido de cada página y pie.
export default function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="layout-body">
        <Sidebar />
        <main className="layout-main bg-body-tertiary">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
