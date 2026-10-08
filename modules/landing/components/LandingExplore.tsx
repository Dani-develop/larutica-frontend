"use client";

import { useRef, useState } from "react";
import { ArrowRight, Bus, CalendarDays, Compass, ShieldCheck, SlidersHorizontal, Trees, Wallet } from "lucide-react";
import { TravelerExplorePage } from "@/components/dashboard/TravelerViews";
import { usePreferences } from "@/lib/preferences/Preferences";
import { LandingSearchBox } from "./LandingSearchBox";
import { beachImage as beach, forestImage as forest, mountainsImage as mountains, popularDestinations } from "../lib/landingImages";
import "../landing.css";

type Category = "all" | "adventure" | "nature" | "transport" | "budget";
type Filters = { destination: string; date: string; people: number };
const emptyFilters: Filters = { destination: "", date: "", people: 0 };
const categories = [
  { id: "all", label: "Buscar todo", icon: Compass },
  { id: "nature", label: "Excursiones", icon: Trees },
  { id: "transport", label: "Transporte", icon: Bus },
  { id: "budget", label: "Menos de USD 50", icon: Wallet },
] as const;

export function LandingExplore({ searchInput, headingRef, category, onCategoryChange, onSearchTransport }: {
  searchInput: React.RefObject<HTMLInputElement | null>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  category: Category;
  onCategoryChange: (category: Category) => void;
  onSearchTransport: () => void;
}) {
  const { t } = usePreferences();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [destination, setDestination] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const isFiltered = Boolean(filters.destination || filters.date || filters.people || category !== "all");

  function showResults() {
    const results = document.getElementById("results");
    results?.scrollIntoView({ behavior: "smooth", block: "start" });
    results?.focus({ preventScroll: true });
  }

  function selectCategory(next: Category) {
    onCategoryChange(next);
  }

  function searchDestination(value: string) {
    setDestination(value);
    setFilters({ ...emptyFilters, destination: value });
    onCategoryChange("all");
    formRef.current?.reset();
    showResults();
  }

  function applySearch(query: string) {
    const values = formRef.current ? new FormData(formRef.current) : null;
    setFilters({ destination: query.trim(), date: String(values?.get("date") || ""), people: Number(values?.get("people") || 0) });
    showResults();
  }

  return (
    <div className="discovery-page">
      <section className="discovery-search" aria-labelledby="hero-title">
        <h1 id="hero-title" ref={headingRef} tabIndex={-1}>{t("¿A dónde vamos?")}</h1>
        <div className="discovery-categories" role="group" aria-label={t("Tipo de servicio")}>
          {categories.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={category === id} onClick={() => selectCategory(id)}>
              <Icon size={22} aria-hidden="true" />{t(label)}
            </button>
          ))}
        </div>
        <form ref={formRef} onSubmit={event => {
          event.preventDefault();
          applySearch(destination);
        }} aria-label={t(category === "transport" ? "Buscar transporte" : "Buscar experiencias")}>
          <LandingSearchBox value={destination} onChange={setDestination} inputRef={searchInput} category={category} onSearch={applySearch} />
          <details className="discovery-availability">
            <summary><SlidersHorizontal size={15} aria-hidden="true" />{t("Fecha y personas")}</summary>
            <div className="discovery-availability-fields">
              <label><span>{t("Fecha")}</span><input name="date" type="date" /></label>
              <label><span>{t("Personas")}</span><select name="people" defaultValue="0"><option value="0">{t("Cualquier cantidad")}</option>{[1, 2, 3, 4, 5, 6].map(number => <option key={number} value={number}>{number}</option>)}</select></label>
            </div>
          </details>
        </form>
      </section>

      <section className="discovery-feature discovery-container" aria-labelledby="discovery-feature-title">
        <div className="discovery-feature-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={beach} alt={t("Playa de Costa Rica")} fetchPriority="high" />
          <span><MapLabel />{t("Costa Rica, a tu ritmo")}</span>
        </div>
        <div className="discovery-feature-copy">
          <h2 id="discovery-feature-title">{t("Tu próxima aventura empieza aquí.")}</h2>
          <p>{t("Encuentra tours, transporte y experiencias verificadas en un solo lugar.")}</p>
          <button type="button" className="discovery-dark-button" onClick={showResults}>{t("Explorar experiencias")}<ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </section>

      <section className="discovery-section discovery-container" aria-labelledby="interest-title">
        <div className="discovery-section-heading">
          <h2 id="interest-title">{t("Encuentra tu forma de viajar")}</h2>
          <p>{t("Una escapada, una aventura o el camino hacia tu próximo destino.")}</p>
        </div>
        <div className="discovery-image-grid">
          {[
            { label: "Naturaleza", image: forest, category: "nature" as Category },
            { label: "Aventura", image: mountains, category: "nature" as Category },
            { label: "Transporte", image: beach, category: "transport" as Category },
            { label: "Viaja por menos", image: mountains, category: "budget" as Category },
          ].map(item => (
            <button key={item.label} type="button" className="discovery-image-tile" onClick={() => { selectCategory(item.category); showResults(); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" loading="lazy" decoding="async" />
              <span>{t(item.label)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="discovery-section discovery-container" aria-labelledby="results">
        <div className="discovery-section-heading discovery-heading-with-action">
          <div><h2 id="results" tabIndex={-1}>{t("Experiencias para tu próximo viaje")}</h2><p>{t("Descubre lo que ofrecen los proveedores locales.")}</p></div>
          {isFiltered ? <button type="button" className="discovery-text-button" onClick={() => { setFilters(emptyFilters); setDestination(""); onCategoryChange("all"); formRef.current?.reset(); }}>{t("Limpiar búsqueda")}</button> : null}
        </div>
        <TravelerExplorePage embedded discovery filters={{ ...filters, type: category === "transport" ? "TRANSPORT" : category === "nature" ? "EXCURSION" : "", budget: category === "budget" }} />
      </section>

      <section className="discovery-destination-band" id="destinos" aria-labelledby="destination-title">
        <div className="discovery-container">
          <div className="discovery-section-heading"><h2 id="destination-title">{t("Tu próxima parada está en Costa Rica")}</h2><p>{t("Explora lugares para salir de la rutina.")}</p></div>
          <div className="discovery-image-grid">
            {popularDestinations.map(item => (
              <button key={item.name} type="button" className="discovery-image-tile discovery-destination-tile" onClick={() => searchDestination(item.name)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" loading="lazy" decoding="async" /><span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="discovery-transport discovery-container" aria-labelledby="transport-title">
        <div className="discovery-transport-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mountains} alt={t("Paisaje verde entre montañas")} loading="lazy" decoding="async" />
        </div>
        <div><p className="discovery-kicker">{t("Muévete con confianza")}</p><h2 id="transport-title">{t("Transporte para conectar tu ruta.")}</h2><p>{t("Compara recorridos, vehículos, precios y contactos antes de salir.")}</p><button type="button" className="discovery-dark-button" onClick={onSearchTransport}>{t("Buscar transporte")}<ArrowRight size={18} aria-hidden="true" /></button></div>
      </section>

      <section className="discovery-trust discovery-container" aria-label={t("Beneficios de LaRutica")}>
        {[{ icon: Compass, title: "Información clara", text: "Precio, duración y cupos visibles." }, { icon: ShieldCheck, title: "Proveedores verificados", text: "Perfiles y servicios revisados." }, { icon: CalendarDays, title: "A tu ritmo", text: "Elige las fechas que van contigo." }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={26} aria-hidden="true" /><div><strong>{t(title)}</strong><p>{t(text)}</p></div></div>)}
      </section>
    </div>
  );
}

function MapLabel() {
  return <Compass size={16} aria-hidden="true" />;
}
