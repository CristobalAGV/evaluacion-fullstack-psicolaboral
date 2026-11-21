import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listarOfertas, obtenerOferta } from "../services/ofertaService";
import { listarFamiliasPublicas } from "../services/postulacionService";
import Postular from "./Postular";
import { etiquetasModalidad } from "../config/modalidadesOferta";

const modalidades = Object.entries(etiquetasModalidad).map(([valor, texto]) => ({ valor, texto }));
const fechaOferta = new Intl.DateTimeFormat("es-CL", {
  day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago",
});
const ubicacionOferta = (oferta) => [oferta.ubicacion, oferta.region].filter(Boolean).join(", ");

function Filtro({ nombre, etiqueta, opciones }) {
  return (
    <label className="col-6 col-lg form-label mb-0">
      {etiqueta}
      <select className="form-select" name={nombre}>
        <option value="">Todas</option>
        {opciones.map(({ valor, texto }) => <option key={valor} value={valor}>{texto}</option>)}
      </select>
    </label>
  );
}

const opcionesTexto = (valores) => valores.map((valor) => ({ valor, texto: valor }));

export function OfertasPublicas() {
  const [filtros, setFiltros] = useState({});
  const [catalogo, setCatalogo] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [errorFamilias, setErrorFamilias] = useState(false);
  const [estado, setEstado] = useState({});

  useEffect(() => {
    listarFamiliasPublicas().then(setFamilias).catch(() => setErrorFamilias(true));
  }, []);

  useEffect(() => {
    let vigente = true;
    listarOfertas({ publicas: true, ...filtros })
      .then((ofertas) => {
        if (!vigente) return;
        setEstado({ ofertas });
        if (Object.values(filtros).every((valor) => !valor)) setCatalogo(ofertas);
      })
      .catch(() => { if (vigente) setEstado({ error: true }); });
    return () => { vigente = false; };
  }, [filtros]);

  const opciones = (campo) => opcionesTexto([...new Set(catalogo.map((oferta) => oferta[campo]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es")));
  return (
    <>
      <header className="bg-primary-subtle border border-primary-subtle rounded-3 p-4 p-md-5 mb-4">
        <h1 className="display-6 fw-semibold text-primary-emphasis">Oportunidades laborales</h1>
        <p className="mb-0 text-body-secondary">Explora vacantes por área y ubicación. Las ofertas de este portal son ficticias y se usan en una demostración académica.</p>
      </header>
      <form className="card shadow-sm mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          setEstado({});
          setFiltros(Object.fromEntries([...new FormData(e.currentTarget)].map(([campo, valor]) => [campo, valor.trim()])));
        }}
        onReset={() => { setEstado({}); setFiltros({}); }}>
        <div className="card-body row g-3">
          <label className="col-12 form-label mb-0">
            Cargo o palabra clave
            <input className="form-control" name="q" maxLength={100} type="search" />
          </label>
          <Filtro nombre="familia" etiqueta="Familia de cargo" opciones={familias.map(({ _id, nombre }) => ({ valor: _id, texto: nombre }))} />
          <Filtro nombre="area" etiqueta="Área" opciones={opciones("area")} />
          <Filtro nombre="region" etiqueta="Región" opciones={opciones("region")} />
          <Filtro nombre="modalidad" etiqueta="Modalidad" opciones={modalidades} />
          <div className="col-12 col-lg-auto d-flex gap-2 align-items-end">
            <button className="btn btn-primary">Buscar</button>
            <button className="btn btn-outline-secondary" type="reset">Limpiar filtros</button>
          </div>
        </div>
      </form>
      {errorFamilias && <p role="alert">No se pudo cargar el filtro por familia.</p>}
      {estado.error && <p role="alert">No pudimos cargar las ofertas. Intenta nuevamente.</p>}
      {!estado.error && !estado.ofertas && <p role="status">Cargando ofertas…</p>}
      {estado.ofertas?.length === 0 && <p>No hay ofertas que coincidan con la búsqueda.</p>}
      <div className="row g-3">
        {estado.ofertas?.map((oferta) => (
          <div className="col-md-6 col-xl-4" key={oferta._id}>
            <article className="card h-100 shadow-sm border-top border-primary border-2">
              <div className="card-body d-flex flex-column">
                <p className="small fw-semibold text-primary-emphasis mb-2">{oferta.area || oferta.familiaDeCargo?.nombre}</p>
                <h2 className="h5">{oferta.cargo}</h2>
                <p className="small text-body-secondary">{ubicacionOferta(oferta)} · {etiquetasModalidad[oferta.modalidad]}
                  {oferta.fechaPublicacion && <> · <time dateTime={oferta.fechaPublicacion}>{fechaOferta.format(new Date(oferta.fechaPublicacion))}</time></>}
                </p>
                <p className="text-break">{oferta.descripcion.length > 180 ? oferta.descripcion.slice(0, 177).trimEnd() + "…" : oferta.descripcion}</p>
                <Link className="btn btn-outline-primary align-self-start mt-auto" aria-label={`Ver oferta: ${oferta.cargo}`}
                  to={`/ofertas/${oferta._id}`}>Ver oferta</Link>
              </div>
            </article>
          </div>
        ))}
      </div>
    </>
  );
}

export function DetalleOfertaPublica({ postular = false }) {
  const { id } = useParams();
  const [estado, setEstado] = useState({});
  useEffect(() => {
    let vigente = true;
    obtenerOferta(id, true)
      .then((oferta) => { if (vigente) setEstado({ id, oferta }); })
      .catch((error) => {
        if (vigente) setEstado({ id, error: error.response?.status === 404
          ? "Esta oferta ya no está disponible." : "No se pudo cargar la oferta." });
      });
    return () => { vigente = false; };
  }, [id]);

  if (estado.id !== id) return <p role="status">Cargando oferta…</p>;
  if (estado.error) return <><p role="alert">{estado.error}</p><Link to="/ofertas">Ver ofertas</Link></>;
  const { oferta } = estado;
  if (postular) return <Postular key={id} oferta={oferta} />;
  return (
    <>
      <Link to="/ofertas">Volver a las ofertas</Link>
      <article className="card shadow-sm mt-3">
        <header className="card-header bg-primary-subtle p-4">
          <p className="fw-semibold text-primary-emphasis mb-2">{oferta.area || oferta.familiaDeCargo?.nombre}</p>
          <h1>{oferta.cargo}</h1>
          <p className="mb-1">{ubicacionOferta(oferta)} · {etiquetasModalidad[oferta.modalidad]}</p>
          {oferta.area && oferta.familiaDeCargo?.nombre && <p className="mb-1 small">Familia de cargo · {oferta.familiaDeCargo.nombre}</p>}
          <p className="mb-0 small">{oferta.cupos} {oferta.cupos === 1 ? "cupo" : "cupos"}
            {oferta.fechaPublicacion && <> · Publicada el <time dateTime={oferta.fechaPublicacion}>{fechaOferta.format(new Date(oferta.fechaPublicacion))}</time></>}
          </p>
        </header>
        <div className="card-body p-4">
          <p className="text-break">{oferta.descripcion}</p>
          {[
            ["Objetivo del cargo", oferta.objetivo],
            ["Funciones principales", oferta.funciones],
            ["Requisitos", oferta.requisitos],
            ["Experiencia requerida", oferta.experiencia],
            ["Estudios requeridos", oferta.estudios],
            ["Conocimientos técnicos", oferta.conocimientos],
            ["Beneficios", oferta.beneficios],
            ["Sueldo o rango salarial", oferta.sueldo],
          ].filter(([, contenido]) => contenido).map(([titulo, contenido]) => (
            <section key={titulo} className="border-top pt-3">
              <h2 className="h5">{titulo}</h2>
              <p className="text-break" style={{ whiteSpace: "pre-line" }}>{contenido}</p>
            </section>
          ))}
          <Link className="btn btn-primary" to={`/ofertas/${id}/postular`}>Postular</Link>
        </div>
      </article>
    </>
  );
}
