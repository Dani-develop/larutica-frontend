"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/lib/preferences/Preferences";
import { listCatalogPublications } from "@/modules/traveler/services/traveler.service";
import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";
import { destinationImage, popularDestinations, serviceFallbackImage } from "../lib/landingImages";
import { highlightParts, matchesQuery, normalizeText } from "../lib/searchText";

type Category = "all" | "adventure" | "nature" | "transport" | "budget";
type Suggestion =
  | { kind: "recent"; id: string; label: string }
  | { kind: "destination"; id: string; label: string; count: number; image: string }
  | { kind: "publication"; id: string; publication: TravelerPublication; image: string }
  | { kind: "all"; id: string; label: string };

const RECENT_KEY = "larutica:recent-searches";
const MAX_RECENT = 3;
const MAX_DESTINATIONS = 4;
const MAX_PUBLICATIONS = 5;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function fitsCategory(publication: TravelerPublication, category: Category) {
  if (category === "transport") return publication.serviceType === "TRANSPORT";
  if (category === "nature") return publication.serviceType === "EXCURSION";
  if (category === "budget") return publication.pricePerPerson < 50;
  return true;
}

function publicationImage(publication: TravelerPublication) {
  return publication.mainImageUrl || destinationImage(publication.destination) || serviceFallbackImage(publication.serviceType);
}

function SuggestionPhoto({ src, fallback }: { src: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="discovery-suggestion-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={failed ? fallback : src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}

export function LandingSearchBox({ value, onChange, inputRef, category, onSearch }: {
  value: string;
  onChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  category: Category;
  onSearch: (query: string) => void;
}) {
  const { t, money } = usePreferences();
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [catalog, setCatalog] = useState<TravelerPublication[]>([]);
  const [catalogState, setCatalogState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const query = value.trim();

  function loadCatalog() {
    if (catalogState === "loading" || catalogState === "ready") return;
    setCatalogState("loading");
    listCatalogPublications()
      .then(rows => { setCatalog(rows); setCatalogState("ready"); })
      .catch(() => setCatalogState("error"));
  }

  const groups = useMemo(() => {
    const pool = catalog.filter(publication => fitsCategory(publication, category));

    const byDestination = new Map<string, { label: string; count: number; image: string }>();
    for (const item of popularDestinations) {
      byDestination.set(normalizeText(item.name), { label: item.name, count: 0, image: item.image });
    }
    for (const publication of pool) {
      const key = normalizeText(publication.destination);
      const entry = byDestination.get(key) ?? { label: publication.destination, count: 0, image: publicationImage(publication) };
      entry.count += 1;
      byDestination.set(key, entry);
    }
    const allDestinations = [...byDestination.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const matchedDestinations = query ? allDestinations.filter(entry => matchesQuery(entry.label, query)) : [];
    const destinationsMatched = matchedDestinations.length > 0;
    const destinations = (destinationsMatched ? matchedDestinations : allDestinations)
      .slice(0, MAX_DESTINATIONS)
      .map((entry): Suggestion => ({ kind: "destination", id: `destination-${entry.label}`, ...entry }));

    const withPhotosFirst = (list: TravelerPublication[]) =>
      [...list].sort((a, b) => Number(Boolean(b.mainImageUrl)) - Number(Boolean(a.mainImageUrl)));
    const matchedPublications = query
      ? pool
        .filter(publication => matchesQuery(`${publication.title} ${publication.destination} ${publication.description}`, query))
        .sort((a, b) => Number(matchesQuery(b.title, query)) - Number(matchesQuery(a.title, query)))
      : [];
    const publicationsMatched = matchedPublications.length > 0;
    const publications = (publicationsMatched ? matchedPublications : withPhotosFirst(pool))
      .slice(0, MAX_PUBLICATIONS)
      .map((publication): Suggestion => ({ kind: "publication", id: `publication-${publication.id}`, publication, image: publicationImage(publication) }));

    return {
      recent: query ? [] : recent.map((label): Suggestion => ({ kind: "recent", id: `recent-${label}`, label })),
      destinations,
      destinationsMatched,
      publications,
      publicationsMatched,
      all: query ? [{ kind: "all", id: "all", label: query } as Suggestion] : [],
    };
  }, [query, recent, catalog, category]);

  const options = [...groups.recent, ...groups.destinations, ...groups.publications, ...groups.all];
  const expanded = open;
  const optionId = (index: number) => `${listId}-option-${index}`;
  const noMatches = Boolean(query) && catalogState === "ready" && !groups.destinationsMatched && !groups.publicationsMatched;
  const publicationsHeading = category === "transport"
    ? (groups.publicationsMatched ? "Transporte" : "Transporte recomendado")
    : (groups.publicationsMatched ? "Experiencias" : "Experiencias recomendadas");

  function remember(label: string) {
    const next = [label, ...recent.filter(item => normalizeText(item) !== normalizeText(label))].slice(0, MAX_RECENT);
    setRecent(next);
    try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }

  function clearRecent() {
    setRecent([]);
    try { window.localStorage.removeItem(RECENT_KEY); } catch { /* storage unavailable */ }
  }

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function choose(option: Suggestion) {
    close();
    if (option.kind === "publication") {
      remember(option.publication.title);
      onChange(option.publication.title);
      router.push(`/experiencias/${option.publication.id}`);
      return;
    }
    remember(option.label);
    onChange(option.label);
    onSearch(option.label);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); loadCatalog(); return; }
      if (!options.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      // -1 means focus stays on the typed text, as in Tripadvisor's typeahead.
      setActiveIndex(current => {
        const next = current + step;
        if (next >= options.length) return -1;
        if (next < -1) return options.length - 1;
        return next;
      });
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "Enter") {
      if (expanded && activeIndex >= 0 && options[activeIndex]) {
        event.preventDefault();
        choose(options[activeIndex]);
        return;
      }
      if (query) remember(query);
      close();
    }
  }

  const renderHighlight = (text: string) =>
    highlightParts(text, query).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>);

  const renderOption = (option: Suggestion) => {
    const current = options.indexOf(option);
    const active = current === activeIndex;
    const common = {
      id: optionId(current),
      role: "option" as const,
      "aria-selected": active,
      className: active ? "discovery-suggestion is-active" : "discovery-suggestion",
      onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
      onMouseEnter: () => setActiveIndex(current),
      onClick: () => choose(option),
    };
    if (option.kind === "recent") {
      return <li key={option.id} {...common}><span className="discovery-suggestion-icon"><Clock size={18} aria-hidden="true" /></span><span className="discovery-suggestion-text"><strong>{option.label}</strong></span></li>;
    }
    if (option.kind === "destination") {
      return <li key={option.id} {...common}>
        <SuggestionPhoto src={option.image} fallback={serviceFallbackImage("EXCURSION")} />
        <span className="discovery-suggestion-text"><strong>{renderHighlight(option.label)}</strong><small>{option.count > 0 ? `Costa Rica · ${option.count} ${t(option.count === 1 ? "servicio" : "servicios")}` : "Costa Rica"}</small></span>
      </li>;
    }
    if (option.kind === "publication") {
      const { publication } = option;
      return <li key={option.id} {...common}>
        <SuggestionPhoto src={option.image} fallback={serviceFallbackImage(publication.serviceType)} />
        <span className="discovery-suggestion-text"><strong>{renderHighlight(publication.title)}</strong><small>{t(publication.serviceType === "TRANSPORT" ? "Transporte" : "Excursión")} · {publication.destination}</small></span>
        <span className="discovery-suggestion-price">{money(publication.pricePerPerson)}</span>
      </li>;
    }
    return <li key={option.id} {...common}><span className="discovery-suggestion-icon"><Search size={18} aria-hidden="true" /></span><span className="discovery-suggestion-text"><strong>{t("Ver todos los resultados para")} “{option.label}”</strong></span></li>;
  };

  const statusText = !open ? "" : catalogState === "loading" ? t("Buscando sugerencias…") : `${options.length} ${t(options.length === 1 ? "sugerencia disponible" : "sugerencias disponibles")}`;

  return (
    <div
      className="discovery-search-combobox"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close(); }}
    >
      <div className="discovery-search-bar">
        <Search size={25} aria-hidden="true" />
        <label className="sr-only" htmlFor="landing-destination">{t("Buscar por experiencia o destino")}</label>
        <input
          id="landing-destination"
          ref={inputRef}
          name="destination"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={value}
          onFocus={() => { setOpen(true); loadCatalog(); }}
          onChange={event => { onChange(event.target.value); setOpen(true); setActiveIndex(-1); loadCatalog(); }}
          onKeyDown={onKeyDown}
          placeholder={t("Destinos, excursiones y experiencias...")}
        />
        {value ? <button type="button" className="discovery-search-clear" aria-label={t("Borrar texto")} onClick={() => { onChange(""); setActiveIndex(-1); inputRef.current?.focus(); }}><X size={18} aria-hidden="true" /></button> : null}
        <Button type="submit" variant="secondary" size="lg" className="lr-brand-accent">{t("Buscar")}</Button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{statusText}</p>
      {expanded ? <div className="discovery-suggestions">
        <ul id={listId} role="listbox" aria-label={t("Sugerencias de búsqueda")}>
          {noMatches ? <li role="presentation" className="discovery-suggestion-note">{t("No encontramos coincidencias exactas. Te sugerimos estas opciones.")}</li> : null}
          {groups.recent.length ? <li role="presentation" className="discovery-suggestion-heading"><span>{t("Búsquedas recientes")}</span><button type="button" onMouseDown={event => event.preventDefault()} onClick={clearRecent}>{t("Borrar")}</button></li> : null}
          {groups.recent.map(renderOption)}
          <li role="presentation" className="discovery-suggestion-heading"><span>{t(groups.destinationsMatched ? "Destinos" : "Destinos populares")}</span></li>
          {groups.destinations.map(renderOption)}
          <li role="presentation" className="discovery-suggestion-heading"><span>{t(publicationsHeading)}</span></li>
          {groups.publications.map(renderOption)}
          {catalogState === "loading" ? <li role="presentation" className="discovery-suggestion-note">{t("Cargando experiencias…")}</li> : null}
          {catalogState === "error" ? <li role="presentation" className="discovery-suggestion-note">{t("No pudimos cargar las experiencias. Intenta de nuevo.")}</li> : null}
          {catalogState === "ready" && !groups.publications.length ? <li role="presentation" className="discovery-suggestion-note">{t("Aún no hay experiencias publicadas para esta categoría.")}</li> : null}
          {groups.all.map(renderOption)}
        </ul>
      </div> : null}
    </div>
  );
}
