import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { listarFamilias } from "../services/familiaService";
import { listarOfertas, obtenerOferta, guardarOferta, cambiarPublicacion, archivarOferta } from "../services/ofertaService";
import { ofertasDemostracion } from "../config/ofertasDemostracion";
import CamposPreseleccion from "../components/CamposPreseleccion";
import { leerCamposPreseleccion } from "../config/camposPreseleccion";
import { etiquetasModalidad } from "../config/modalidadesOferta";

const alcance = [
  ["descripcion", "Descripción", 4000, true], ["objetivo", "Objetivo del cargo", 4000],
  ["funciones", "Funciones principales", 4000, true],
];
const perfil = [
  ["requisitos", "Requisitos", 4000, true], ["experiencia", "Experiencia requerida", 1000],
  ["estudios", "Estudios requeridos", 1000], ["conocimientos", "Conocimientos técnicos", 2000],
];
const errorApi = (error) => error.response?.data?.mensaje || "No se pudo completar la operación.";
const nombresEstado = { borrador: "Borrador", publicada: "Publicada", archivada: "Archivada" };

function CampoOferta({ campo: [nombre, etiqueta, maxLength, requerido = false], datos }) {
  const Control = maxLength > 160 ? "textarea" : "input";
  return <label className={Control === "textarea" ? "col-12 form-label" : "col-md-4 form-label"}>
    {etiqueta}
    <Control className="form-control" name={nombre} required={requerido} maxLength={maxLength} defaultValue={datos?.[nombre]} />
  </label>;
}

export function GestionOfertas() {
  const [estado, setEstado] = useState({});
  const [error, setError] = useState("");
  const [ocupada, setOcupada] = useState(false);
  const [confirmar, setConfirmar] = useState(null);

  async function cargar() {
    try {
      setEstado({ ofertas: await listarOfertas() });
    } catch (err) {
      setEstado({ error: errorApi(err) });
    }
  }
  useEffect(() => {
    let vigente = true;
    listarOfertas()
      .then((ofertas) => { if (vigente) setEstado({ ofertas }); })
      .catch((err) => { if (vigente) setEstado({ error: errorApi(err) }); });
    return () => { vigente = false; };
  }, []);

  async function ejecutar(operacion) {
    setOcupada(true);
    setError("");
    try {
      await operacion();
      setConfirmar(null);
      await cargar();
    } catch (err) {
      setError(errorApi(err));
    } finally {
      setOcupada(false);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gestión de ofertas</h1>
        <Link className="btn btn-primary" to="/gestion/ofertas/nueva">Nueva oferta</Link>
      </div>
      {(error || estado.error) && <p className="alert alert-danger" role="alert">{error || estado.error}</p>}
      {!estado.ofertas && !estado.error && <p role="status">Cargando ofertas…</p>}
      {estado.ofertas?.length === 0 && <p>Aún no hay ofertas registradas.</p>}
      {estado.ofertas?.map((oferta) => (
        <article className="card shadow-sm mb-2" key={oferta._id}>
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h2 className="h5 mb-1"><Link to={`/gestion/ofertas/${oferta._id}`}>{oferta.cargo}</Link></h2>
              <span className="text-body-secondary">
                {[oferta.area || oferta.familiaDeCargo?.nombre, oferta.ubicacion, oferta.region].filter(Boolean).join(" · ")}
              </span>
              <span className="badge text-bg-light ms-2">{nombresEstado[oferta.estado]}</span>
            </div>
            {oferta.estado !== "archivada" && <div className="d-flex flex-wrap gap-2">
              <button disabled={ocupada} className="btn btn-outline-primary" onClick={() =>
                ejecutar(() => cambiarPublicacion(oferta._id, oferta.estado !== "publicada"))}>
                {oferta.estado === "publicada" ? "Despublicar" : "Publicar"}
              </button>
              {confirmar === oferta._id ? <>
                <button disabled={ocupada} className="btn btn-danger" onClick={() => ejecutar(() => archivarOferta(oferta._id))}>Confirmar archivo</button>
                <button disabled={ocupada} className="btn btn-secondary" onClick={() => setConfirmar(null)}>Cancelar</button>
              </> : <button disabled={ocupada} className="btn btn-outline-danger" onClick={() => setConfirmar(oferta._id)}>Archivar</button>}
            </div>}
          </div>
        </article>
      ))}
    </>
  );
}

export function FormularioOferta() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [estado, setEstado] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ejemplo, setEjemplo] = useState("");

  useEffect(() => {
    let vigente = true;
    Promise.all([listarFamilias(), id ? obtenerOferta(id) : null])
      .then(([familias, oferta]) => { if (vigente) setEstado({ id, familias, oferta }); })
      .catch((err) => { if (vigente) setEstado({ id, error: errorApi(err) }); });
    return () => { vigente = false; };
  }, [id]);

  async function guardar(e) {
    e.preventDefault();
    const formulario = new FormData(e.currentTarget);
    const requisitosEstructurados = leerCamposPreseleccion(formulario, "excluyentes");
    const requisitosDeseables = leerCamposPreseleccion(formulario, "deseables");
    const datos = Object.fromEntries(formulario);
    setGuardando(true);
    setError("");
    try {
      await guardarOferta({ ...datos, cupos: Number(datos.cupos), requisitosEstructurados, requisitosDeseables }, id);
      navegar("/gestion/ofertas");
    } catch (err) {
      setError(errorApi(err));
      setGuardando(false);
    }
  }

  const { oferta, familias } = estado;
  const archivada = oferta?.estado === "archivada";
  const borrador = id ? oferta : ofertasDemostracion.find(({ cargo }) => cargo === ejemplo);
  const familiaInicial = oferta?.familiaDeCargo?._id ??
    familias?.find(({ nombre }) => nombre === borrador?.familia)?._id ?? "";
  return (
    <>
      <Link to="/gestion/ofertas">Volver a gestión de ofertas</Link>
      <h1 className="mt-3">{oferta?.cargo || (id ? "Detalle de oferta" : "Nueva oferta")}</h1>
      {estado.id === id && estado.error && <p role="alert">{estado.error}</p>}
      {!id && familias && <label className="form-label mb-3">
        Cargar ejemplo ficticio
        <select className="form-select" value={ejemplo} disabled={guardando} onChange={(e) => {
          setError("");
          setEjemplo(e.target.value);
        }}>
          <option value="">Empezar con formulario vacío</option>
          {ofertasDemostracion.map(({ cargo }) => <option key={cargo}>{cargo}</option>)}
        </select>
        <span className="form-text">Al cambiar el ejemplo se reemplazan los campos del formulario.</span>
      </label>}
      {estado.id === id && familias ? <form key={id ?? ejemplo} className="card shadow-sm" onSubmit={guardar}>
        <fieldset className="card-body row g-3" disabled={guardando || archivada}>
          {id && <p className="mb-0">{nombresEstado[oferta.estado]}{oferta.fechaPublicacion &&
            ` · ${new Date(oferta.fechaPublicacion).toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}`}</p>}
          <h2 className="h5 col-12 mb-0">Datos de la vacante</h2>
          {[
            ["cargo", "Cargo", 100, true], ["area", "Área", 100], ["region", "Región", 100],
            ["ubicacion", "Ubicación", 160, true],
          ].map((campo) => <CampoOferta key={campo[0]} campo={campo} datos={borrador} />)}
          <label className="col-md-3 form-label">
            Familia de cargo
            <select className="form-select" name="familiaDeCargo" required defaultValue={familiaInicial}>
              <option value="">Selecciona una familia</option>
              {familias.map((familia) => <option key={familia._id} value={familia._id}>{familia.nombre}</option>)}
            </select>
          </label>
          <label className="col-md-5 form-label">
            Modalidad
            <select className="form-select" name="modalidad" required defaultValue={borrador?.modalidad ?? "presencial"}>
              {Object.entries(etiquetasModalidad).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </label>
          <label className="col-md-2 form-label">
            Cupos
            <input className="form-control" name="cupos" type="number" required min="1" max="10000" defaultValue={borrador?.cupos ?? 1} />
          </label>
          <h2 className="h5 col-12 border-top pt-3 mb-0">Alcance del cargo</h2>
          {alcance.map((campo) => <CampoOferta key={campo[0]} campo={campo} datos={borrador} />)}
          <h2 className="h5 col-12 border-top pt-3 mb-0">Perfil requerido</h2>
          {perfil.map((campo) => <CampoOferta key={campo[0]} campo={campo} datos={borrador} />)}
          <div className="col-12 border-top pt-3">
            <h2 className="h5">Requisitos para preselección</h2>
            <p className="small text-secondary">Usa criterios vinculados al cargo y evita los datos personales sensibles. Separa los elementos de una lista con comas.</p>
            <h3 className="h6">Excluyentes</h3>
            <CamposPreseleccion grupo="excluyentes" datos={borrador?.requisitosEstructurados} />
            <h3 className="h6 mt-3">Deseables</h3>
            <CamposPreseleccion grupo="deseables" datos={borrador?.requisitosDeseables} />
          </div>
          <h2 className="h5 col-12 border-top pt-3 mb-0">Condiciones</h2>
          <CampoOferta campo={["beneficios", "Beneficios", 4000, true]} datos={borrador} />
          <CampoOferta campo={["sueldo", "Sueldo o rango salarial", 160, true]} datos={borrador} />
          {!archivada && <div><button className="btn btn-primary">{guardando ? "Guardando…" : "Guardar oferta"}</button></div>}
        </fieldset>
        {error && <p className="alert alert-danger m-3" role="alert">{error}</p>}
      </form> : !estado.error && <p role="status">Cargando formulario…</p>}
    </>
  );
}
