"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { TransportConfirmView } from "@/modules/landing/components/TransportConfirmView";
import { TransportDetailView } from "@/modules/landing/components/TransportDetailView";
import { matchRoutes, publishedRoutes } from "@/modules/landing/lib/routeSearch";
import { useReservations } from "@/modules/transport/reservations/hooks/useReservations";
import type { TransportReservation } from "@/modules/transport/reservations/models/Reservation";
import { useRoutes } from "@/modules/transport/routes/hooks/useRoutes";
import { routeTitle } from "@/modules/transport/routes/models/Route";

type View = "explore" | "detail" | "route-detail" | "route-confirm" | "agency" | "transport" | "publish" | "promotion" | "admin";
type ExploreCategory = "all" | "adventure" | "nature" | "transport" | "budget";

const experiences = [
  { id: 1, title: "Caminata al volcán Arenal", place: "La Fortuna, Alajuela", meta: "4 h · Español e inglés", price: "$58", rating: "4,9", badge: "Más reservado", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82", alt: "Sendero verde entre montañas tropicales" },
  { id: 2, title: "Bosque nuboso de Monteverde", place: "Monteverde, Puntarenas", meta: "3 h · Guía local", price: "$42", rating: "4,8", badge: "Cupos hoy", image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=82", alt: "Bosque tropical cubierto de neblina" },
  { id: 3, title: "Atardecer en catamarán", place: "Playas del Coco, Guanacaste", meta: "5 h · Incluye refrigerio", price: "$76", rating: "4,7", badge: "Patrocinado", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82", alt: "Playa tropical de arena clara y mar azul" },
];

const publications = [
  { title: "Caminata al volcán Arenal", status: "Publicada", views: "1 284", bookings: "36", price: "$58" },
  { title: "Termales y cena local", status: "En revisión", views: "—", bookings: "—", price: "$64" },
  { title: "Traslado SJO → La Fortuna", status: "Borrador", views: "—", bookings: "—", price: "$42" },
];

export default function Home() {
  const [view, setView] = useState<View>("explore");
  const [status, setStatus] = useState("Explora opciones seleccionadas para ti.");
  const [saved, setSaved] = useState<number[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [approved, setApproved] = useState<string[]>([]);
  const [category, setCategory] = useState<ExploreCategory>("all");
  const [routeQuery, setRouteQuery] = useState("");
  const [bookingDate, setBookingDate] = useState("2026-08-22");
  const [bookingPeople, setBookingPeople] = useState("2");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [lastReservation, setLastReservation] = useState<TransportReservation | null>(null);
  const { routes } = useRoutes();
  const { create: createReservation } = useReservations();
  const mainHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const visibleRoutes = matchRoutes(routes, category === "transport" ? routeQuery : "");
  const featuredRoute = publishedRoutes(routes)[0];
  const selectedRoute = routes.find((route) => route.id === selectedRouteId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && view === "explore" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape") {
        setHelpOpen(false);
        setAccessOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view]);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [largeText, highContrast]);

  function navigate(next: View, nextStatus?: string) {
    setView(next);
    setStatus(nextStatus ?? `Pantalla ${screenName(next)} abierta.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => mainHeading.current?.focus(), 80);
  }

  function screenName(next: View) {
    return ({
      explore: "Explorar",
      detail: "Detalle de experiencia",
      "route-detail": "Detalle de ruta",
      "route-confirm": "Reserva de transporte",
      agency: "Panel de agencia",
      transport: "Panel de transporte",
      publish: "Nueva publicación",
      promotion: "Promoción",
      admin: "Administración",
    } as Record<View, string>)[next];
  }

  function providerHome(): View {
    return "agency";
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const destination = String(data.get("destination") ?? "").trim();
    const date = String(data.get("date") ?? bookingDate);
    const people = String(data.get("people") ?? bookingPeople);
    setBookingDate(date);
    setBookingPeople(people);
    if (category === "transport") {
      const matches = matchRoutes(routes, destination);
      setRouteQuery(destination);
      setStatus(
        matches.length === 1
          ? "Búsqueda de transporte: 1 ruta publicada."
          : `Búsqueda de transporte: ${matches.length} rutas publicadas.`,
      );
    } else {
      setStatus("Búsqueda completada: 24 experiencias cerca de La Fortuna.");
    }
    document.getElementById("results")?.focus();
  }

  function openTransportSearch() {
    setCategory("transport");
    setRouteQuery("");
    navigate("explore", "Rutas de transporte publicadas.");
    window.setTimeout(() => document.getElementById("results")?.scrollIntoView(), 100);
  }

  function openRoute(id: string) {
    setSelectedRouteId(id);
    navigate("route-detail");
  }

  function toggleSaved(id: number, title: string) {
    const exists = saved.includes(id);
    setSaved(exists ? saved.filter((item) => item !== id) : [...saved, id]);
    setStatus(exists ? `${title} se eliminó de tus guardados.` : `${title} se guardó en tu viaje.`);
  }

  return (
    <>
      <a className="skip-link" href="#main">Ir al contenido principal</a>
      <header className="site-header">
        <button className="brand brand-button" type="button" onClick={() => navigate("explore")} aria-label="LaRutica, volver al inicio">
          <span className="brand-mark" aria-hidden="true" /><span>LaRutica</span>
        </button>
        <nav aria-label="Navegación principal">
          <button className={view === "explore" || view === "detail" || view === "route-detail" || view === "route-confirm" ? "nav-active" : ""} onClick={() => navigate("explore")} aria-current={view === "explore" ? "page" : undefined}>Explorar</button>
          <button onClick={() => { navigate("explore"); setStatus("Sección Destinos abierta: 18 destinos disponibles."); window.setTimeout(() => document.getElementById("destinos")?.scrollIntoView(), 100); }}>Destinos</button>
          <button onClick={() => setHelpOpen(true)}>Ayuda</button>
        </nav>
        <div className="header-actions">
          <button className="button button-quiet access-button" type="button" onClick={() => setAccessOpen(true)}>Accesibilidad</button>
          <Link className="button button-outline" href="/login">Ingresar</Link>
        </div>
      </header>
      <p className="global-status sr-only" role="status" aria-live="polite">{status}</p>

      <main id="main">
        {view === "explore" && <ExploreView onSearch={search} searchInput={searchInput} status={status} saved={saved} onSave={toggleSaved} onDetail={() => navigate("detail")} headingRef={mainHeading} category={category} onCategoryChange={(next) => { setCategory(next); if (next === "transport") { setRouteQuery(""); setStatus("Rutas de transporte publicadas."); } else { setStatus("Explora opciones seleccionadas para ti."); } }} routes={visibleRoutes} featuredRoute={featuredRoute} onOpenRoute={openRoute} onSearchTransport={openTransportSearch} isTransport={category === "transport"} />}
        {view === "detail" && <DetailView onBack={() => navigate("explore")} setStatus={setStatus} headingRef={mainHeading} />}
        {view === "route-detail" && selectedRoute && (
          <TransportDetailView
            route={selectedRoute}
            defaultDate={bookingDate}
            defaultPeople={bookingPeople}
            headingRef={mainHeading}
            onBack={() => { setCategory("transport"); navigate("explore"); }}
            onConfirm={({ date, people, totalUsd }) => {
              const reservation = createReservation({
                routeId: selectedRoute.id,
                origin: selectedRoute.origin,
                destination: selectedRoute.destination,
                date,
                people,
                totalUsd,
                status: "Confirmada",
              });
              setLastReservation(reservation);
              navigate(
                "route-confirm",
                `Reserva registrada: ${routeTitle(selectedRoute)} · ${people} ${people === 1 ? "persona" : "personas"} · $${totalUsd}`,
              );
            }}
          />
        )}
        {view === "route-confirm" && lastReservation && (
          <TransportConfirmView
            reservation={lastReservation}
            headingRef={mainHeading}
            onBack={() => { setCategory("transport"); navigate("explore"); }}
          />
        )}
        {view === "agency" && <AgencyView onPublish={() => navigate("publish")} onPromote={() => navigate("promotion")} setStatus={setStatus} headingRef={mainHeading} />}
        {view === "transport" && <TransportView onPublish={() => navigate("publish")} onPromote={() => navigate("promotion")} setStatus={setStatus} headingRef={mainHeading} />}
        {view === "publish" && <PublishView onBack={() => navigate(providerHome())} onComplete={() => { setStatus("Publicación guardada y enviada a revisión."); navigate(providerHome()); }} headingRef={mainHeading} />}
        {view === "promotion" && <PromotionView onBack={() => navigate(providerHome())} onComplete={() => { setStatus("Simulación completada: promoción activa por 7 días."); navigate(providerHome()); }} headingRef={mainHeading} />}
        {view === "admin" && <AdminView approved={approved} setApproved={setApproved} setStatus={setStatus} headingRef={mainHeading} />}
      </main>

      <button className="help-fab" type="button" onClick={() => setHelpOpen(true)}>¿Necesitas ayuda?</button>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {accessOpen && <AccessDialog largeText={largeText} setLargeText={setLargeText} highContrast={highContrast} setHighContrast={setHighContrast} onClose={() => setAccessOpen(false)} />}
      <footer><button className="brand brand-button footer-brand" type="button" onClick={() => navigate("explore")}><span className="brand-mark" aria-hidden="true" />LaRutica</button><p>Prototipo académico · Costa Rica · 2026</p><button className="footer-link" type="button" onClick={() => setAccessOpen(true)}>Opciones de accesibilidad</button></footer>
    </>
  );
}

function ExploreView({
  onSearch,
  searchInput,
  status,
  saved,
  onSave,
  onDetail,
  headingRef,
  category,
  onCategoryChange,
  routes,
  featuredRoute,
  onOpenRoute,
  onSearchTransport,
  isTransport,
}: {
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  searchInput: React.RefObject<HTMLInputElement | null>;
  status: string;
  saved: number[];
  onSave: (id: number, title: string) => void;
  onDetail: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  category: ExploreCategory;
  onCategoryChange: (next: ExploreCategory) => void;
  routes: ReturnType<typeof publishedRoutes>;
  featuredRoute?: ReturnType<typeof publishedRoutes>[number];
  onOpenRoute: (id: string) => void;
  onSearchTransport: () => void;
  isTransport: boolean;
}) {
  const chips: Array<{ id: ExploreCategory; label: string }> = [
    { id: "all", label: "Todas" },
    { id: "adventure", label: "Aventura" },
    { id: "nature", label: "Naturaleza" },
    { id: "transport", label: "Transporte" },
    { id: "budget", label: "Menos de $50" },
  ];

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Viaja a tu ritmo</p>
          <h1 id="hero-title" ref={headingRef} tabIndex={-1}>
            Costa Rica, más cerca de lo que imaginas.
          </h1>
          <p className="hero-lead">
            Encuentra tours, transporte y experiencias verificadas en un solo lugar.
          </p>
          <form
            className="search-panel"
            onSubmit={onSearch}
            aria-label={isTransport ? "Buscar transporte" : "Buscar experiencias"}
          >
            <label>
              <span>{isTransport ? "¿De dónde a dónde?" : "¿A dónde quieres ir?"}</span>
              <input
                ref={searchInput}
                name="destination"
                defaultValue={isTransport ? "" : "La Fortuna"}
                key={isTransport ? "transport-search" : "tour-search"}
                autoComplete="address-level2"
                placeholder={isTransport ? "Nosara, Liberia, San José..." : undefined}
              />
              <small>Atajo: presiona /</small>
            </label>
            <label>
              <span>Fecha</span>
              <input name="date" type="date" defaultValue="2026-08-22" />
            </label>
            <label>
              <span>Personas</span>
              <select name="people" defaultValue="2">
                <option value="1">1 persona</option>
                <option value="2">2 personas</option>
                <option value="3">3 personas</option>
                <option value="4">4 o más</option>
              </select>
            </label>
            <button className="button button-primary search-button" type="submit">
              Buscar
            </button>
          </form>
          <p className="status-line" role="status" aria-live="polite">
            {status}
          </p>
        </div>
        <div className="hero-visual" role="img" aria-label="Bosque tropical de Costa Rica">
          <div className="floating-note">
            <strong>120+ experiencias</strong>
            <span>de proveedores locales</span>
          </div>
        </div>
      </section>
      <section className="section" aria-labelledby="results" id="destinos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isTransport ? "Transporte" : "Recomendado para ti"}</p>
            <h2 id="results" tabIndex={-1}>
              {isTransport ? "Rutas para conectar tu viaje" : "Experiencias que valen el viaje"}
            </h2>
          </div>
          <button
            className="text-link"
            type="button"
            onClick={isTransport ? onSearchTransport : undefined}
          >
            {isTransport ? `Ver las ${routes.length} rutas` : "Ver las 24 opciones"}
          </button>
        </div>
        <div className="filter-row" aria-label="Filtros rápidos">
          {chips.map((chip) => (
            <button
              key={chip.id}
              className={category === chip.id ? "chip chip-active" : "chip"}
              type="button"
              onClick={() => onCategoryChange(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {isTransport ? (
          <div className="card-grid">
            {routes.length > 0 ? (
              routes.map((route) => (
                <article className="experience-card" key={route.id}>
                  <div className="card-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={route.coverUrl} alt={routeTitle(route)} />
                    <span className="badge">{route.vehicleType}</span>
                  </div>
                  <div className="card-body">
                    <p className="card-place">{route.providerName}</p>
                    <h3>{routeTitle(route)}</h3>
                    <p>
                      {route.duration} · {route.seats} asientos
                    </p>
                    <div className="card-footer">
                      <span>
                        <strong>${route.priceUsd}</strong> por persona
                      </span>
                      <button
                        className="button button-small"
                        type="button"
                        onClick={() => onOpenRoute(route.id)}
                      >
                        Ver servicio
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p>No encontramos rutas publicadas con esa búsqueda.</p>
            )}
          </div>
        ) : (
          <div className="card-grid">
            {experiences.map((item) => (
              <article className="experience-card" key={item.id}>
                <div className="card-image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.alt} />
                  <span className="badge">{item.badge}</span>
                  <button
                    className="save-button"
                    type="button"
                    aria-pressed={saved.includes(item.id)}
                    onClick={() => onSave(item.id, item.title)}
                  >
                    {saved.includes(item.id) ? "Guardado" : "Guardar"}
                  </button>
                </div>
                <div className="card-body">
                  <p className="card-place">{item.place}</p>
                  <h3>{item.title}</h3>
                  <p>
                    {item.meta} · <strong>{item.rating}</strong>/5
                  </p>
                  <div className="card-footer">
                    <span>
                      <strong>{item.price}</strong> por persona
                    </span>
                    <button className="button button-small" type="button" onClick={onDetail}>
                      Ver detalle
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="transport-section" aria-labelledby="transport-title">
        <div>
          <p className="eyebrow eyebrow-light">Muévete con confianza</p>
          <h2 id="transport-title">Transporte para conectar tu ruta.</h2>
          <p>Compara recorridos, vehículos, precios y contactos antes de salir.</p>
          <button className="button button-light" type="button" onClick={onSearchTransport}>
            Buscar transporte
          </button>
        </div>
        {featuredRoute ? (
          <div className="route-card">
            <p className="card-place">Ruta disponible hoy</p>
            <strong>{routeTitle(featuredRoute)}</strong>
            <span>
              {featuredRoute.vehicleType} · {featuredRoute.duration}
            </span>
            <div>
              <b>${featuredRoute.priceUsd}</b>
              <button
                className="button button-small"
                type="button"
                onClick={() => onOpenRoute(featuredRoute.id)}
              >
                Ver servicio
              </button>
            </div>
          </div>
        ) : null}
      </section>
      <section className="trust-strip" aria-label="Beneficios de LaRutica">
        <div>
          <strong>Información clara</strong>
          <span>Precio, duración y cupos visibles.</span>
        </div>
        <div>
          <strong>Proveedores verificados</strong>
          <span>Perfiles y servicios revisados.</span>
        </div>
        <div>
          <strong>Ayuda cuando la necesites</strong>
          <span>Soporte contextual y pasos sencillos.</span>
        </div>
      </section>
    </>
  );
}

function DetailView({ onBack, setStatus, headingRef }: { onBack: () => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const [people, setPeople] = useState("2");
  return <div className="detail-page page-shell"><button className="back-link" onClick={onBack} type="button">← Volver a resultados</button><div className="detail-grid">
    <div><div className="detail-image"><img src={experiences[0].image} alt={experiences[0].alt} /><span className="badge">Proveedor verificado</span></div><p className="eyebrow detail-eyebrow">La Fortuna, Alajuela</p><h1 className="detail-title" ref={headingRef} tabIndex={-1}>Caminata al volcán Arenal</h1><p className="detail-intro">Explora senderos de lava, bosque tropical y miradores del Arenal junto a una guía local certificada.</p><div className="facts" aria-label="Información de la experiencia"><div><strong>4 horas</strong><span>Duración</span></div><div><strong>Fácil–moderada</strong><span>Dificultad</span></div><div><strong>ES / EN</strong><span>Idiomas</span></div><div><strong>12 máx.</strong><span>Grupo</span></div></div><h2 className="subheading">Lo que incluye</h2><ul className="check-list"><li>Guía naturalista y entrada al sendero</li><li>Transporte desde el centro de La Fortuna</li><li>Agua y refrigerio de fruta local</li></ul><h2 className="subheading">Punto de encuentro</h2><p>Parque central de La Fortuna. Recibirás el contacto del proveedor al confirmar.</p></div>
    <aside className="booking-card" aria-label="Seleccionar disponibilidad"><p><strong>$58</strong> por persona</p><p className="rating-line">4,9/5 · 128 opiniones</p><label><span>Fecha</span><input type="date" defaultValue="2026-08-22" /></label><label><span>Personas</span><select value={people} onChange={(event) => setPeople(event.target.value)}><option value="1">1 persona</option><option value="2">2 personas</option><option value="3">3 personas</option><option value="4">4 personas</option></select></label><div className="total-row"><span>Total estimado</span><strong>${58 * Number(people)}</strong></div><button className="button button-primary button-full" type="button" onClick={() => setStatus("Experiencia agregada a tu plan. Puedes modificarla o eliminarla en cualquier momento.")}>Agregar a mi plan</button><p className="fine-print">No se realiza ningún cobro en este prototipo.</p></aside>
  </div></div>;
}

function AgencyView({ onPublish, onPromote, setStatus, headingRef }: { onPublish: () => void; onPromote: () => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  return <DashboardShell title="Panel de agencia" subtitle="Arenal Viajes · Perfil verificado" headingRef={headingRef} actions={<button className="button button-primary" onClick={onPublish}>Nueva publicación</button>}>
    <div className="notice notice-success"><strong>Tu perfil está completo.</strong><span>Las personas pueden ver tus datos de contacto y servicios activos.</span></div>
    <div className="metric-grid"><Metric value="3" label="Publicaciones" note="1 en revisión" /><Metric value="1 284" label="Vistas este mes" note="+18% frente a julio" /><Metric value="36" label="Consultas" note="8 esta semana" /><Metric value="4,8" label="Valoración" note="52 opiniones" /></div>
    <section className="dashboard-section" aria-labelledby="pub-title"><div className="dashboard-heading"><div><h2 id="pub-title" className="dashboard-title">Mis publicaciones</h2><p>Administra excursiones y servicios de transporte.</p></div><button className="button button-outline" onClick={onPromote}>Promocionar</button></div><div className="table-scroll"><table><caption className="sr-only">Publicaciones de la agencia</caption><thead><tr><th>Servicio</th><th>Estado</th><th>Precio</th><th>Vistas</th><th>Consultas</th><th>Acciones</th></tr></thead><tbody>{publications.map((item) => <tr key={item.title}><td><strong>{item.title}</strong></td><td><span className={`status-pill status-${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</span></td><td>{item.price}</td><td>{item.views}</td><td>{item.bookings}</td><td><button className="text-link" type="button" onClick={() => setStatus(`${item.title} abierto para edición.`)}>Editar</button></td></tr>)}</tbody></table></div></section>
    <section className="quick-grid" aria-labelledby="quick-title"><h2 id="quick-title" className="sr-only">Accesos rápidos</h2><button onClick={onPublish}><strong>Crear excursión</strong><span>Agrega precio, duración, ruta e imagen.</span></button><button onClick={onPublish}><strong>Publicar transporte</strong><span>Define recorrido, vehículo y contacto.</span></button><button onClick={onPromote}><strong>Destacar un servicio</strong><span>Simula una promoción de 7 días.</span></button></section>
  </DashboardShell>;
}

function TransportView({ onPublish, onPromote, setStatus, headingRef }: { onPublish: () => void; onPromote: () => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const routes = [
    { title: "San José → La Fortuna", status: "Publicada", views: "842", bookings: "21", price: "$42" },
    { title: "Liberia → Tamarindo", status: "En revisión", views: "—", bookings: "—", price: "$35" },
    { title: "SJO → Playas del Coco", status: "Borrador", views: "—", bookings: "—", price: "$48" },
  ];
  return <DashboardShell title="Panel de transporte" subtitle="Transportes Sol · Perfil verificado" headingRef={headingRef} actions={<button className="button button-primary" onClick={onPublish}>Nueva ruta</button>}>
    <div className="notice notice-success"><strong>Tu perfil está completo.</strong><span>Los viajeros pueden ver tus rutas, vehículos y contactos.</span></div>
    <div className="metric-grid"><Metric value="3" label="Rutas" note="1 en revisión" /><Metric value="842" label="Vistas este mes" note="+12% frente a julio" /><Metric value="21" label="Consultas" note="5 esta semana" /><Metric value="4,7" label="Valoración" note="38 opiniones" /></div>
    <section className="dashboard-section" aria-labelledby="routes-title"><div className="dashboard-heading"><div><h2 id="routes-title" className="dashboard-title">Mis rutas</h2><p>Administra traslados y servicios de transporte.</p></div><button className="button button-outline" onClick={onPromote}>Promocionar</button></div><div className="table-scroll"><table><caption className="sr-only">Rutas del proveedor de transporte</caption><thead><tr><th>Servicio</th><th>Estado</th><th>Precio</th><th>Vistas</th><th>Consultas</th><th>Acciones</th></tr></thead><tbody>{routes.map((item) => <tr key={item.title}><td><strong>{item.title}</strong></td><td><span className={`status-pill status-${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</span></td><td>{item.price}</td><td>{item.views}</td><td>{item.bookings}</td><td><button className="text-link" type="button" onClick={() => setStatus(`${item.title} abierto para edición.`)}>Editar</button></td></tr>)}</tbody></table></div></section>
    <section className="quick-grid" aria-labelledby="transport-quick"><h2 id="transport-quick" className="sr-only">Accesos rápidos</h2><button onClick={onPublish}><strong>Publicar traslado</strong><span>Define recorrido, vehículo y contacto.</span></button><button onClick={onPublish}><strong>Agregar vehículo</strong><span>Capacidad, tipo y disponibilidad.</span></button><button onClick={onPromote}><strong>Destacar una ruta</strong><span>Simula una promoción de 7 días.</span></button></section>
  </DashboardShell>;
}

function PublishView({ onBack, onComplete, headingRef }: { onBack: () => void; onComplete: () => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const [type, setType] = useState("Excursión"); const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); if (!String(data.get("title")).trim()) { setError("Escribe un nombre descriptivo para continuar."); document.getElementById("publication-title")?.focus(); } else onComplete(); }
  return <div className="form-page page-shell"><button className="back-link" type="button" onClick={onBack}>← Volver a publicaciones</button><div className="form-header"><p className="eyebrow">Paso 1 de 3 · Información básica</p><h1 className="form-title" ref={headingRef} tabIndex={-1}>Nueva publicación</h1><p>Completa los datos que verá el viajero. Podrás revisar todo antes de enviar.</p><div className="progress-track" aria-label="Progreso: paso 1 de 3"><span style={{ width: "33%" }} /></div></div><form className="editor-form" onSubmit={submit} noValidate><fieldset><legend>Tipo de servicio</legend><div className="segmented"><label><input type="radio" name="type" value="Excursión" checked={type === "Excursión"} onChange={() => setType("Excursión")} /><span>Excursión</span></label><label><input type="radio" name="type" value="Transporte" checked={type === "Transporte"} onChange={() => setType("Transporte")} /><span>Transporte</span></label></div></fieldset><label><span>Nombre de la publicación</span><input id="publication-title" name="title" aria-invalid={Boolean(error)} aria-describedby={error ? "title-error" : "title-help"} /><small id="title-help">Ejemplo: Caminata al volcán Arenal al amanecer.</small></label>{error && <p className="error-message" id="title-error" role="alert">{error}</p>}<label><span>Descripción</span><textarea name="description" rows={5} maxLength={500} defaultValue="Recorrido guiado por senderos de bosque tropical con vistas al volcán." /><small>Describe qué hará la persona, qué incluye y qué debe llevar. Máximo 500 caracteres.</small></label><div className="field-grid"><label><span>Destino</span><select name="destination" defaultValue="La Fortuna"><option>La Fortuna</option><option>Monteverde</option><option>Guanacaste</option></select></label><label><span>Precio por persona (USD)</span><input name="price" inputMode="decimal" defaultValue="58" /></label></div><div className="field-grid"><label><span>Duración</span><input name="duration" defaultValue="4 horas" /></label><label><span>Idiomas</span><input name="languages" defaultValue="Español, inglés" /></label></div><div className="notice"><strong>Antes de publicar</strong><span>La administración revisará que la información sea clara y segura.</span></div><div className="form-actions"><button className="button button-quiet" type="button" onClick={onBack}>Cancelar</button><button className="button button-outline" type="button">Guardar borrador</button><button className="button button-primary" type="submit">Continuar</button></div></form></div>;
}

function PromotionView({ onBack, onComplete, headingRef }: { onBack: () => void; onComplete: () => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  return <div className="form-page page-shell"><button className="back-link" type="button" onClick={onBack}>← Volver al panel</button><div className="form-header"><p className="eyebrow">Simulación de compra</p><h1 className="form-title" ref={headingRef} tabIndex={-1}>Destaca tu publicación</h1><p>Obtén mayor visibilidad en resultados y destinos durante 7 días.</p></div><div className="promotion-grid"><section className="editor-form" aria-labelledby="promo-options"><h2 id="promo-options" className="dashboard-title">Elige una publicación</h2><label className="select-card"><input type="radio" name="publication" defaultChecked /><span><strong>Caminata al volcán Arenal</strong><small>Publicada · $58 por persona</small></span></label><label className="select-card"><input type="radio" name="publication" /><span><strong>Termales y cena local</strong><small>Disponible cuando sea aprobada</small></span></label><h2 className="dashboard-title">Vista previa</h2><div className="sponsored-preview"><span className="badge static-badge">Patrocinado</span><strong>Caminata al volcán Arenal</strong><span>Aparecerá primero en búsquedas relacionadas con La Fortuna.</span></div></section><aside className="summary-card"><h2>Resumen</h2><div><span>Promoción de 7 días</span><strong>$12,00</strong></div><div><span>Impuestos</span><strong>$1,56</strong></div><div className="total-row"><span>Total simulado</span><strong>$13,56</strong></div><button className="button button-primary button-full" type="button" onClick={onComplete}>Simular compra</button><p className="fine-print">Demostración académica: no se solicitarán datos bancarios ni se realizará un cobro.</p></aside></div></div>;
}

function AdminView({ approved, setApproved, setStatus, headingRef }: { approved: string[]; setApproved: (value: string[]) => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const pending = ["Termales y cena local", "Traslado Liberia → Tamarindo"];
  function approve(title: string) { setApproved([...approved, title]); setStatus(`${title} fue aprobado. La agencia recibirá una notificación.`); }
  return <DashboardShell title="Administración" subtitle="Resumen general de LaRutica" headingRef={headingRef} actions={<button className="button button-outline">Exportar resumen</button>}><div className="metric-grid"><Metric value="286" label="Usuarios" note="+24 este mes" /><Metric value="38" label="Agencias" note="32 verificadas" /><Metric value="124" label="Publicaciones" note="2 por revisar" /><Metric value="18" label="Destinos" note="3 provincias nuevas" /></div><div className="admin-grid"><section className="dashboard-section" aria-labelledby="review-title"><div className="dashboard-heading"><div><p className="eyebrow">Requiere atención</p><h2 id="review-title" className="dashboard-title">Publicaciones pendientes</h2></div><span className="count-badge">{pending.filter((item) => !approved.includes(item)).length}</span></div>{pending.map((title, index) => !approved.includes(title) && <article className="review-item" key={title}><div><strong>{title}</strong><span>{index === 0 ? "Arenal Viajes · Excursión" : "Transportes Sol · Transporte"}</span></div><div><button className="button button-quiet" type="button">Revisar</button><button className="button button-primary" type="button" onClick={() => approve(title)}>Aprobar</button></div></article>)}{pending.every((item) => approved.includes(item)) && <div className="empty-state"><strong>Todo al día</strong><span>No quedan publicaciones pendientes.</span></div>}</section><aside className="dashboard-section activity-panel"><h2 className="dashboard-title">Actividad reciente</h2><ol className="activity-list"><li><strong>Nueva agencia registrada</strong><span>Pacific Blue Tours · hace 12 min</span></li><li><strong>Destino actualizado</strong><span>Monteverde · hace 45 min</span></li><li><strong>Promoción activada</strong><span>Arenal Viajes · hace 2 h</span></li></ol></aside></div><section className="quick-grid admin-quick" aria-label="Gestión administrativa"><button><strong>Gestionar usuarios</strong><span>Revisa perfiles, roles y estado.</span></button><button><strong>Administrar destinos</strong><span>Crea y actualiza lugares.</span></button><button><strong>Ver promociones</strong><span>Consulta servicios destacados.</span></button></section></DashboardShell>;
}

function DashboardShell({ title, subtitle, headingRef, actions, children }: { title: string; subtitle: string; headingRef: React.RefObject<HTMLHeadingElement | null>; actions: React.ReactNode; children: React.ReactNode }) { return <div className="dashboard"><header className="dashboard-header"><div><p className="eyebrow">LaRutica</p><h1 ref={headingRef} tabIndex={-1}>{title}</h1><p>{subtitle}</p></div>{actions}</header>{children}</div>; }
function Metric({ value, label, note }: { value: string; label: string; note: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }

function HelpDialog({ onClose }: { onClose: () => void }) { return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="dialog-close" aria-label="Cerrar ayuda" onClick={onClose}>Cerrar</button><p className="eyebrow">Ayuda contextual</p><h2 id="help-title">¿Qué quieres hacer?</h2><div className="help-options"><button><strong>Buscar una experiencia</strong><span>Usa destino, fecha y cantidad de personas.</span></button><button><strong>Publicar un servicio</strong><span>Ingresa y regístrate como Agencia o Transporte.</span></button><button><strong>Ingresar a tu cuenta</strong><span>Usa el botón Ingresar o crea una en Registrarse.</span></button></div><p className="help-note">Consejo: presiona <kbd>Esc</kbd> para cerrar cualquier panel.</p></section></div>; }

function AccessDialog({ largeText, setLargeText, highContrast, setHighContrast, onClose }: { largeText: boolean; setLargeText: (value: boolean) => void; highContrast: boolean; setHighContrast: (value: boolean) => void; onClose: () => void }) { return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="dialog access-dialog" role="dialog" aria-modal="true" aria-labelledby="access-title"><button className="dialog-close" aria-label="Cerrar opciones de accesibilidad" onClick={onClose}>Cerrar</button><p className="eyebrow">Preferencias</p><h2 id="access-title">Accesibilidad visual</h2><p>Los cambios se aplican inmediatamente a todo el prototipo.</p><label className="toggle-row"><span><strong>Texto más grande</strong><small>Aumenta el tamaño de lectura.</small></span><input type="checkbox" role="switch" checked={largeText} onChange={(event) => setLargeText(event.target.checked)} /></label><label className="toggle-row"><span><strong>Contraste reforzado</strong><small>Oscurece textos y bordes.</small></span><input type="checkbox" role="switch" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} /></label><div className="notice"><strong>Navegación por teclado</strong><span>Usa Tab para avanzar, Shift + Tab para volver y Enter para activar.</span></div></section></div>; }
