"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TravelerDetailsPage,
  TravelerExplorePage,
  TravelerProfilePage,
  TravelerPurchasePage,
  TravelerReservationsPage,
  TravelerSavedPage,
} from "@/components/dashboard/TravelerViews";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { LandingExplore } from "@/modules/landing/components/LandingExplore";
import { SiteHeader } from "@/modules/landing/components/SiteHeader";
import { AccessDialog, HelpDialog } from "@/modules/landing/components/SiteDialogs";
import { TransportConfirmView } from "@/modules/landing/components/TransportConfirmView";
import { TransportDetailView } from "@/modules/landing/components/TransportDetailView";
import { parseTrip, tripPath } from "@/modules/landing/lib/travelerRoutes";
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
  const { t } = usePreferences();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, user, loading: authLoading } = useAuth();
  const trip = parseTrip(searchParams.get("viaje"));
  const publicationId = searchParams.get("publicacion") ?? "";
  const showTrip = Boolean(trip && !authLoading && session && user?.role === "Viajero");
  const tripMenuActive = trip === "guardados" || trip === "reservas" ? trip : null;
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

  useEffect(() => {
    if (trip === "explorar") {
      const provider = searchParams.get("provider");
      router.replace(provider ? `/?provider=${encodeURIComponent(provider)}` : "/");
      return;
    }
    if (!trip || authLoading) return;
    if (!session) {
      const next = `/${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (user?.role !== "Viajero") router.replace("/");
  }, [trip, authLoading, session, user?.role, router, searchParams]);

  function navigate(next: View, nextStatus?: string) {
    if (searchParams.get("viaje") || searchParams.get("publicacion") || searchParams.get("provider")) {
      router.replace("/");
    }
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

  function openExplore() {
    setCategory("all");
    navigate("explore");
  }

  return (
    <div className={trip ? "landing-shell landing-trip" : view === "explore" ? "landing-shell landing-discovery" : "landing-shell"}>
      <a className="skip-link" href="#main">{t("Ir al contenido principal")}</a>
      <SiteHeader
        exploreActive={trip === "explorar" || (!trip && (view === "explore" || view === "detail" || view === "route-detail" || view === "route-confirm"))}
        exploreCurrent={trip === "explorar" || (!trip && view === "explore")}
        tripMenuActive={tripMenuActive}
        onBrand={() => navigate("explore")}
        onExplore={openExplore}
        onDestinations={() => { navigate("explore"); setStatus("Explora los destinos disponibles."); window.setTimeout(() => document.getElementById("destinos")?.scrollIntoView(), 100); }}
        onTripSelect={(id) => { router.push(tripPath(id)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onHelp={() => setHelpOpen(true)}
        onAccess={() => setAccessOpen(true)}
      />
      <p className="global-status sr-only" role="status" aria-live="polite">{status}</p>

      <main id="main">
        {trip && authLoading ? <p className="trip-status">{t("Validando sesión...")}</p> : null}
        {trip && !authLoading && !showTrip ? <p className="trip-status">{t("Redirigiendo...")}</p> : null}
        {showTrip && trip === "explorar" ? <TravelerExplorePage /> : null}
        {showTrip && trip === "guardados" ? <TravelerSavedPage /> : null}
        {showTrip && trip === "reservas" ? <TravelerReservationsPage /> : null}
        {showTrip && trip === "perfil" ? <TravelerProfilePage /> : null}
        {showTrip && trip === "detalle" ? <TravelerDetailsPage publicationId={publicationId} /> : null}
        {showTrip && trip === "compra" ? <TravelerPurchasePage publicationId={publicationId} /> : null}
        {!trip && view === "explore" && <ExploreView onSearch={search} searchInput={searchInput} status={status} saved={saved} onSave={toggleSaved} onDetail={() => navigate("detail")} headingRef={mainHeading} category={category} onCategoryChange={(next) => { setCategory(next); if (next === "transport") { setRouteQuery(""); setStatus("Rutas de transporte publicadas."); } else { setStatus("Explora opciones seleccionadas para ti."); } }} routes={visibleRoutes} featuredRoute={featuredRoute} onOpenRoute={openRoute} onSearchTransport={openTransportSearch} isTransport={category === "transport"} />}
        {!trip && view === "detail" && <DetailView onBack={() => navigate("explore")} setStatus={setStatus} headingRef={mainHeading} />}
        {!trip && view === "route-detail" && selectedRoute && (
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
        {!trip && view === "route-confirm" && lastReservation && (
          <TransportConfirmView
            reservation={lastReservation}
            headingRef={mainHeading}
            onBack={() => { setCategory("transport"); navigate("explore"); }}
          />
        )}
        {!trip && view === "agency" && <AgencyView onPublish={() => navigate("publish")} onPromote={() => navigate("promotion")} setStatus={setStatus} headingRef={mainHeading} />}
        {!trip && view === "transport" && <TransportView onPublish={() => navigate("publish")} onPromote={() => navigate("promotion")} setStatus={setStatus} headingRef={mainHeading} />}
        {!trip && view === "publish" && <PublishView onBack={() => navigate(providerHome())} onComplete={() => { setStatus("Publicación guardada y enviada a revisión."); navigate(providerHome()); }} headingRef={mainHeading} />}
        {!trip && view === "promotion" && <PromotionView onBack={() => navigate(providerHome())} onComplete={() => { setStatus("Simulación completada: promoción activa por 7 días."); navigate(providerHome()); }} headingRef={mainHeading} />}
        {!trip && view === "admin" && <AdminView approved={approved} setApproved={setApproved} setStatus={setStatus} headingRef={mainHeading} />}
      </main>

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {accessOpen && <AccessDialog largeText={largeText} setLargeText={setLargeText} highContrast={highContrast} setHighContrast={setHighContrast} onClose={() => setAccessOpen(false)} />}
      <footer>
        <Link className="brand footer-brand" href="/" aria-label={t("LaRutica, volver al inicio")}>
          <span className="brand-mark" aria-hidden="true" />{t("LaRutica ")}</Link>
        <p>{t("Prototipo académico · Costa Rica · 2026")}</p>
        <div className="footer-links">
          <Link className="footer-link" href="/terminos">{t("Términos y condiciones")}</Link>
          <Link className="footer-link" href="/privacidad">{t("Política de privacidad")}</Link>
          <button className="footer-link" type="button" onClick={() => setAccessOpen(true)}>{t("Opciones de accesibilidad")}</button>
          <button className="footer-help" type="button" onClick={() => setHelpOpen(true)}>{t("¿Necesitas ayuda?")}</button>
        </div>
      </footer>
    </div>
  );
}

function ExploreView({
  searchInput,
  headingRef,
  category,
  onCategoryChange,
  onSearchTransport,
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
  return <LandingExplore searchInput={searchInput} headingRef={headingRef} category={category} onCategoryChange={onCategoryChange} onSearchTransport={onSearchTransport} />;
}

function DetailView({ onBack, setStatus, headingRef }: { onBack: () => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = usePreferences();
  const [people, setPeople] = useState("2");
  return <div className="detail-page page-shell"><button className="back-link" onClick={onBack} type="button">{t("← Volver a resultados")}</button><div className="detail-grid">
    <div><div className="detail-image"><img src={experiences[0].image} alt={experiences[0].alt} /><span className="badge">{t("Proveedor verificado")}</span></div><p className="eyebrow detail-eyebrow">{t("La Fortuna, Alajuela")}</p><h1 className="detail-title lr-page-title" ref={headingRef} tabIndex={-1}>{t("Caminata al volcán Arenal")}</h1><p className="detail-intro">{t("Explora senderos de lava, bosque tropical y miradores del Arenal junto a una guía local certificada.")}</p><div className="facts" aria-label={t("Información de la experiencia")}><div><strong>{t("4 horas")}</strong><span>{t("Duración")}</span></div><div><strong>{t("Fácil–moderada")}</strong><span>{t("Dificultad")}</span></div><div><strong>{t("ES / EN")}</strong><span>{t("Idiomas")}</span></div><div><strong>{t("12 máx.")}</strong><span>{t("Grupo")}</span></div></div><h2 className="subheading">{t("Lo que incluye")}</h2><ul className="check-list"><li>{t("Guía naturalista y entrada al sendero")}</li><li>{t("Transporte desde el centro de La Fortuna")}</li><li>{t("Agua y refrigerio de fruta local")}</li></ul><h2 className="subheading">{t("Punto de encuentro")}</h2><p>{t("Parque central de La Fortuna. Recibirás el contacto del proveedor al confirmar.")}</p></div>
    <aside className="booking-card" aria-label={t("Seleccionar disponibilidad")}><p><strong>$58</strong>{t(" por persona")}</p><p className="rating-line">{t("4,9/5 · 128 opiniones")}</p><label><span>{t("Fecha")}</span><input type="date" /></label><label><span>{t("Personas")}</span><select value={people} onChange={(event) => setPeople(event.target.value)}><option value="1">{t("1 persona")}</option><option value="2">{t("2 personas")}</option><option value="3">{t("3 personas")}</option><option value="4">{t("4 personas")}</option></select></label><div className="total-row"><span>{t("Total estimado")}</span><strong>${58 * Number(people)}</strong></div><button className="button button-primary button-full" type="button" onClick={() => setStatus("Experiencia agregada a tu plan. Puedes modificarla o eliminarla en cualquier momento.")}>{t("Agregar a mi plan")}</button><p className="fine-print">{t("No se realiza ningún cobro en este prototipo.")}</p></aside>
  </div></div>;
}

function AgencyView({ onPublish, onPromote, setStatus, headingRef }: { onPublish: () => void; onPromote: () => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = usePreferences();
  return <DashboardShell title={t("Panel de agencia")} subtitle="Arenal Viajes · Perfil verificado" headingRef={headingRef} actions={<button className="button button-primary" onClick={onPublish}>Nueva publicación</button>}>
    <div className="notice notice-success"><strong>{t("Tu perfil está completo.")}</strong><span>{t("Las personas pueden ver tus datos de contacto y servicios activos.")}</span></div>
    <div className="metric-grid"><Metric value="3" label="Publicaciones" note="1 en revisión" /><Metric value="1 284" label="Vistas este mes" note="+18% frente a julio" /><Metric value="36" label="Consultas" note="8 esta semana" /><Metric value="4,8" label="Valoración" note="52 opiniones" /></div>
    <section className="dashboard-section" aria-labelledby="pub-title"><div className="dashboard-heading"><div><h2 id="pub-title" className="dashboard-title">{t("Mis publicaciones")}</h2><p>{t("Administra excursiones y servicios de transporte.")}</p></div><button className="button button-outline" onClick={onPromote}>{t("Promocionar")}</button></div><div className="table-scroll"><table><caption className="sr-only">{t("Publicaciones de la agencia")}</caption><thead><tr><th>{t("Servicio")}</th><th>{t("Estado")}</th><th>{t("Precio")}</th><th>{t("Vistas")}</th><th>{t("Consultas")}</th><th>{t("Acciones")}</th></tr></thead><tbody>{publications.map((item) => <tr key={item.title}><td><strong>{item.title}</strong></td><td><span className={`status-pill status-${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</span></td><td>{item.price}</td><td>{item.views}</td><td>{item.bookings}</td><td><button className="text-link" type="button" onClick={() => setStatus(`${item.title} abierto para edición.`)}>{t("Editar")}</button></td></tr>)}</tbody></table></div></section>
    <section className="quick-grid" aria-labelledby="quick-title"><h2 id="quick-title" className="sr-only">{t("Accesos rápidos")}</h2><button onClick={onPublish}><strong>{t("Crear excursión")}</strong><span>{t("Agrega precio, duración, ruta e imagen.")}</span></button><button onClick={onPublish}><strong>{t("Publicar transporte")}</strong><span>{t("Define recorrido, vehículo y contacto.")}</span></button><button onClick={onPromote}><strong>{t("Destacar un servicio")}</strong><span>{t("Simula una promoción de 7 días.")}</span></button></section>
  </DashboardShell>;
}

function TransportView({ onPublish, onPromote, setStatus, headingRef }: { onPublish: () => void; onPromote: () => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = usePreferences();
  const routes = [
    { title: "San José → La Fortuna", status: "Publicada", views: "842", bookings: "21", price: "$42" },
    { title: "Liberia → Tamarindo", status: "En revisión", views: "—", bookings: "—", price: "$35" },
    { title: "SJO → Playas del Coco", status: "Borrador", views: "—", bookings: "—", price: "$48" },
  ];
  return <DashboardShell title={t("Panel de transporte")} subtitle="Transportes Sol · Perfil verificado" headingRef={headingRef} actions={<button className="button button-primary" onClick={onPublish}>Nueva ruta</button>}>
    <div className="notice notice-success"><strong>{t("Tu perfil está completo.")}</strong><span>{t("Los viajeros pueden ver tus rutas, vehículos y contactos.")}</span></div>
    <div className="metric-grid"><Metric value="3" label="Rutas" note="1 en revisión" /><Metric value="842" label="Vistas este mes" note="+12% frente a julio" /><Metric value="21" label="Consultas" note="5 esta semana" /><Metric value="4,7" label="Valoración" note="38 opiniones" /></div>
    <section className="dashboard-section" aria-labelledby="routes-title"><div className="dashboard-heading"><div><h2 id="routes-title" className="dashboard-title">{t("Mis rutas")}</h2><p>{t("Administra traslados y servicios de transporte.")}</p></div><button className="button button-outline" onClick={onPromote}>{t("Promocionar")}</button></div><div className="table-scroll"><table><caption className="sr-only">{t("Rutas del proveedor de transporte")}</caption><thead><tr><th>{t("Servicio")}</th><th>{t("Estado")}</th><th>{t("Precio")}</th><th>{t("Vistas")}</th><th>{t("Consultas")}</th><th>{t("Acciones")}</th></tr></thead><tbody>{routes.map((item) => <tr key={item.title}><td><strong>{item.title}</strong></td><td><span className={`status-pill status-${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</span></td><td>{item.price}</td><td>{item.views}</td><td>{item.bookings}</td><td><button className="text-link" type="button" onClick={() => setStatus(`${item.title} abierto para edición.`)}>{t("Editar")}</button></td></tr>)}</tbody></table></div></section>
    <section className="quick-grid" aria-labelledby="transport-quick"><h2 id="transport-quick" className="sr-only">{t("Accesos rápidos")}</h2><button onClick={onPublish}><strong>{t("Publicar traslado")}</strong><span>{t("Define recorrido, vehículo y contacto.")}</span></button><button onClick={onPublish}><strong>{t("Agregar vehículo")}</strong><span>{t("Capacidad, tipo y disponibilidad.")}</span></button><button onClick={onPromote}><strong>{t("Destacar una ruta")}</strong><span>{t("Simula una promoción de 7 días.")}</span></button></section>
  </DashboardShell>;
}

function PublishView({ onBack, onComplete, headingRef }: { onBack: () => void; onComplete: () => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = usePreferences();
  const [type, setType] = useState("Excursión"); const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); if (!String(data.get("title")).trim()) { setError("Escribe un nombre descriptivo para continuar."); document.getElementById("publication-title")?.focus(); } else onComplete(); }
  return <div className="form-page page-shell"><button className="back-link" type="button" onClick={onBack}>{t("← Volver a publicaciones")}</button><div className="form-header"><p className="eyebrow">{t("Paso 1 de 3 · Información básica")}</p><h1 className="form-title lr-page-title" ref={headingRef} tabIndex={-1}>{t("Nueva publicación")}</h1><p>{t("Completa los datos que verá el viajero. Podrás revisar todo antes de enviar.")}</p><div className="progress-track" aria-label={t("Progreso: paso 1 de 3")}><span style={{ width: "33%" }} /></div></div><form className="editor-form" onSubmit={submit} noValidate><fieldset><legend>{t("Tipo de servicio")}</legend><div className="segmented"><label><input type="radio" name="type" value="Excursión" checked={type === "Excursión"} onChange={() => setType("Excursión")} /><span>{t("Excursión")}</span></label><label><input type="radio" name="type" value="Transporte" checked={type === "Transporte"} onChange={() => setType("Transporte")} /><span>{t("Transporte")}</span></label></div></fieldset><label><span>{t("Nombre de la publicación")}</span><input id="publication-title" name="title" aria-invalid={Boolean(error)} aria-describedby={error ? "title-error" : "title-help"} /><small id="title-help">{t("Ejemplo: Caminata al volcán Arenal al amanecer.")}</small></label>{error && <p className="error-message" id="title-error" role="alert">{t(error)}</p>}<label><span>{t("Descripción")}</span><textarea name="description" rows={5} maxLength={500} defaultValue="Recorrido guiado por senderos de bosque tropical con vistas al volcán." /><small>{t("Describe qué hará la persona, qué incluye y qué debe llevar. Máximo 500 caracteres.")}</small></label><div className="field-grid"><label><span>{t("Destino")}</span><select name="destination" defaultValue="La Fortuna"><option>{t("La Fortuna")}</option><option>{t("Monteverde")}</option><option>{t("Guanacaste")}</option></select></label><label><span>{t("Precio por persona (USD)")}</span><input name="price" inputMode="decimal" defaultValue="58" /></label></div><div className="field-grid"><label><span>{t("Duración")}</span><input name="duration" defaultValue="4 horas" /></label><label><span>{t("Idiomas")}</span><input name="languages" defaultValue="Español, inglés" /></label></div><div className="notice"><strong>{t("Antes de publicar")}</strong><span>{t("La administración revisará que la información sea clara y segura.")}</span></div><div className="form-actions"><button className="button button-quiet" type="button" onClick={onBack}>{t("Cancelar")}</button><button className="button button-outline" type="button">{t("Guardar borrador")}</button><button className="button button-primary" type="submit">{t("Continuar")}</button></div></form></div>;
}

function PromotionView({ onBack, onComplete, headingRef }: { onBack: () => void; onComplete: () => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = usePreferences();
  return <div className="form-page page-shell"><button className="back-link" type="button" onClick={onBack}>{t("← Volver al panel")}</button><div className="form-header"><p className="eyebrow">{t("Simulación de compra")}</p><h1 className="form-title lr-page-title" ref={headingRef} tabIndex={-1}>{t("Destaca tu publicación")}</h1><p>{t("Obtén mayor visibilidad en resultados y destinos durante 7 días.")}</p></div><div className="promotion-grid"><section className="editor-form" aria-labelledby="promo-options"><h2 id="promo-options" className="dashboard-title">{t("Elige una publicación")}</h2><label className="select-card" aria-label={t("Seleccionar publicación")}><input type="radio" name="publication" defaultChecked /><span><strong>{t("Caminata al volcán Arenal")}</strong><small>{t("Publicada · $58 por persona")}</small></span></label><label className="select-card" aria-label={t("Seleccionar publicación")}><input type="radio" name="publication" /><span><strong>{t("Termales y cena local")}</strong><small>{t("Disponible cuando sea aprobada")}</small></span></label><h2 className="dashboard-title">{t("Vista previa")}</h2><div className="sponsored-preview"><span className="badge static-badge">{t("Patrocinado")}</span><strong>{t("Caminata al volcán Arenal")}</strong><span>{t("Aparecerá primero en búsquedas relacionadas con La Fortuna.")}</span></div></section><aside className="summary-card"><h2>{t("Resumen")}</h2><div><span>{t("Promoción de 7 días")}</span><strong>$12,00</strong></div><div><span>{t("Impuestos")}</span><strong>$1,56</strong></div><div className="total-row"><span>{t("Total simulado")}</span><strong>$13,56</strong></div><button className="button button-primary button-full" type="button" onClick={onComplete}>{t("Simular compra")}</button><p className="fine-print">{t("Demostración académica: no se solicitarán datos bancarios ni se realizará un cobro.")}</p></aside></div></div>;
}

function AdminView({ approved, setApproved, setStatus, headingRef }: { approved: string[]; setApproved: (value: string[]) => void; setStatus: (value: string) => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = usePreferences();
  const pending = ["Termales y cena local", "Traslado Liberia → Tamarindo"];
  function approve(title: string) { setApproved([...approved, title]); setStatus(`${title} fue aprobado. La agencia recibirá una notificación.`); }
  return <DashboardShell title={t("Administración")} subtitle="Resumen general de LaRutica" headingRef={headingRef} actions={<button className="button button-outline">Exportar resumen</button>}><div className="metric-grid"><Metric value="286" label="Usuarios" note="+24 este mes" /><Metric value="38" label="Agencias" note="32 verificadas" /><Metric value="124" label="Publicaciones" note="2 por revisar" /><Metric value="18" label="Destinos" note="3 provincias nuevas" /></div><div className="admin-grid"><section className="dashboard-section" aria-labelledby="review-title"><div className="dashboard-heading"><div><p className="eyebrow">{t("Requiere atención")}</p><h2 id="review-title" className="dashboard-title">{t("Publicaciones pendientes")}</h2></div><span className="count-badge">{pending.filter((item) => !approved.includes(item)).length}</span></div>{pending.map((title, index) => !approved.includes(title) && <article className="review-item" key={title}><div><strong>{t(title)}</strong><span>{index === 0 ? t("Arenal Viajes · Excursión") : t("Transportes Sol · Transporte")}</span></div><div><button className="button button-quiet" type="button">{t("Revisar")}</button><button className="button button-primary" type="button" onClick={() => approve(title)}>{t("Aprobar")}</button></div></article>)}{pending.every((item) => approved.includes(item)) && <div className="empty-state"><strong>{t("Todo al día")}</strong><span>{t("No quedan publicaciones pendientes.")}</span></div>}</section><aside className="dashboard-section activity-panel"><h2 className="dashboard-title">{t("Actividad reciente")}</h2><ol className="activity-list"><li><strong>{t("Nueva agencia registrada")}</strong><span>{t("Pacific Blue Tours · hace 12 min")}</span></li><li><strong>{t("Destino actualizado")}</strong><span>{t("Monteverde · hace 45 min")}</span></li><li><strong>{t("Promoción activada")}</strong><span>{t("Arenal Viajes · hace 2 h")}</span></li></ol></aside></div><section className="quick-grid admin-quick" aria-label={t("Gestión administrativa")}><button><strong>{t("Gestionar usuarios")}</strong><span>{t("Revisa perfiles, roles y estado.")}</span></button><button><strong>{t("Administrar destinos")}</strong><span>{t("Crea y actualiza lugares.")}</span></button><button><strong>{t("Ver promociones")}</strong><span>{t("Consulta servicios destacados.")}</span></button></section></DashboardShell>;
}

function DashboardShell({ title, subtitle, headingRef, actions, children }: { title: string; subtitle: string; headingRef: React.RefObject<HTMLHeadingElement | null>; actions: React.ReactNode; children: React.ReactNode }) {
  const { t } = usePreferences(); return <div className="dashboard"><header className="dashboard-header"><div><p className="eyebrow">{t("LaRutica")}</p><h1 ref={headingRef} tabIndex={-1}>{t(title)}</h1><p>{subtitle}</p></div>{actions}</header>{children}</div>; }
function Metric({ value, label, note }: { value: string; label: string; note: string }) {
  const { t } = usePreferences(); return <article className="metric-card"><span>{t(label)}</span><strong>{value}</strong><small>{note}</small></article>; }
