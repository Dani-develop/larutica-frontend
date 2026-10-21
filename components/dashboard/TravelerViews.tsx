"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Heart, MapPin, SlidersHorizontal, Star, X } from "lucide-react";
import { CurrencyNotice } from "@/components/preferences/PreferenceControls";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { ExperienceDetail } from "@/modules/booking/ExperienceDetail";
import { UpcomingReservationCard } from "@/modules/booking/UpcomingReservationCard";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SystemUser } from "@/modules/crm/users/models/User";
import { MyProfilePage } from "@/modules/crm/users/components/MyProfilePage";
import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";
import { tripPath } from "@/modules/landing/lib/travelerRoutes";
import { matchesQuery } from "@/modules/landing/lib/searchText";
import {
  listSavedPublications,
  listCatalogPublications,
  listSavedPublicationIds,
  rateReservation,
  setPublicationSaved,
} from "@/modules/traveler/services/traveler.service";
import {
  listReservations,
  updateReservation,
  type Reservation,
  type ReservationStatus,
} from "@/modules/transport/reservations/services/reservation.service";

const reservationAlertClasses = {
  popup: "larutica-swal-popup",
  title: "larutica-swal-title",
  htmlContainer: "larutica-swal-text",
  confirmButton: "larutica-swal-confirm",
  cancelButton: "larutica-swal-cancel",
};

function TripHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  const { t } = usePreferences();
  return (
    <div className="trip-page-heading">
      <p className="eyebrow">{t(eyebrow)}</p>
      <h1 className="detail-title">{t(title)}</h1>
      <p className="detail-intro">{t(lead)}</p>
    </div>
  );
}

type LandingDurationFilter = "SHORT" | "HALF" | "FULL";
type LandingServiceFilter = "EXCURSION" | "TRANSPORT";

type LandingAdvancedFilters = {
  destination: string;
  minPrice: string;
  maxPrice: string;
  serviceTypes: LandingServiceFilter[];
  durations: LandingDurationFilter[];
  availableOnly: boolean;
};

const EMPTY_ADVANCED_FILTERS: LandingAdvancedFilters = {
  destination: "",
  minPrice: "",
  maxPrice: "",
  serviceTypes: [],
  durations: [],
  availableOnly: false,
};

const DURATION_LABELS: Record<LandingDurationFilter, string> = {
  SHORT: "Hasta 120 min",
  HALF: "De 121 a 240 min",
  FULL: "Más de 240 min",
};

function matchesAdvancedFilters(
  publication: TravelerPublication,
  filters: LandingAdvancedFilters,
) {
  const destination = filters.destination.trim().toLocaleLowerCase();
  const minPrice = filters.minPrice === "" ? null : Number(filters.minPrice);
  const maxPrice = filters.maxPrice === "" ? null : Number(filters.maxPrice);

  if (
    destination &&
    !`${publication.destination} ${publication.title}`
      .toLocaleLowerCase()
      .includes(destination)
  ) {
    return false;
  }

  if (minPrice !== null && Number.isFinite(minPrice) && publication.pricePerPerson < minPrice) {
    return false;
  }

  if (maxPrice !== null && Number.isFinite(maxPrice) && publication.pricePerPerson > maxPrice) {
    return false;
  }

  if (
    filters.serviceTypes.length > 0 &&
    !filters.serviceTypes.includes(publication.serviceType as LandingServiceFilter)
  ) {
    return false;
  }

  if (filters.durations.length > 0) {
    const duration = publication.durationMinutes ?? 0;
    const durationMatches = filters.durations.some((filter) => {
      if (filter === "SHORT") return duration <= 120;
      if (filter === "HALF") return duration > 120 && duration <= 240;
      return duration > 240;
    });

    if (!durationMatches) return false;
  }

  if (
    filters.availableOnly &&
    !publication.departures?.some((departure) => departure.available > 0)
  ) {
    return false;
  }

  return true;
}

function splitIntoTwoRows(
  publications: TravelerPublication[],
): [TravelerPublication[], TravelerPublication[]] {
  if (publications.length <= 4) {
    return [
      publications,
      [],
    ];
  }

  if (publications.length <= 8) {
    return [
      publications.slice(
        0,
        4,
      ),
      publications.slice(
        4,
      ),
    ];
  }

  const firstRowSize =
    Math.ceil(
      publications.length /
        2,
    );

  return [
    publications.slice(
      0,
      firstRowSize,
    ),
    publications.slice(
      firstRowSize,
    ),
  ];
}

export function TravelerExplorePage({ embedded = false, discovery = false, filters }: { embedded?: boolean; discovery?: boolean; filters?: { destination:string; date:string; people:number; type:string; budget:boolean } } = {}) {
  const { t, money } = usePreferences();
  const { user } = useAuth();
  const [retry, setRetry] = useState(0);
  const [savedError, setSavedError] = useState("");
  const provider = useSearchParams().get("provider");
  const [search, setSearch] = useState("");
  const [publications, setPublications] = useState<TravelerPublication[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loadedProvider, setLoadedProvider] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ provider: string; message: string } | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<LandingAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [draftFilters, setDraftFilters] = useState<LandingAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [destinationSearch, setDestinationSearch] = useState("");
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filterDialogRef = useRef<HTMLElement | null>(null);
  const filterCloseRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef(false);
  const providerKey = provider ?? "";
  const loading = loadedProvider !== providerKey;
  const error = loadError?.provider === providerKey ? loadError.message : null;

  useEffect(() => {
    let cancelled = false;
    listCatalogPublications()
      .then((publicationRows) => {
        if (!cancelled) {
          setPublications(publicationRows);
          setLoadError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError({
            provider: providerKey,
            message: cause instanceof Error ? cause.message : "No se pudieron cargar las publicaciones.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedProvider(providerKey);
      });
    return () => {
      cancelled = true;
    };
  }, [providerKey, retry]);

  useEffect(() => {
    if (user?.role !== "Viajero") return;
    let cancelled = false;
    listSavedPublicationIds().then(ids => { if (!cancelled) setSavedIds(ids); })
      .catch(() => { if (!cancelled) setSavedError("No pudimos consultar Guardados. Puedes seguir explorando y reservar."); });
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!filterPanelOpen) {
      if (returnFocusRef.current) {
        returnFocusRef.current = false;
        filterTriggerRef.current?.focus();
      }
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    filterCloseRef.current?.focus();

    function handleDialogKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setFilterPanelOpen(false);
        returnFocusRef.current = true;
        return;
      }
      if (event.key !== "Tab") return;
      const panel = filterDialogRef.current;
      if (!panel) return;
      const candidates = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0);
      if (candidates.length === 0) return;
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleDialogKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeys);
    };
  }, [filterPanelOpen]);

  const searchQuery = filters?.destination ?? search;

  const baseVisiblePublications = useMemo(() => publications.filter((publication) =>
    (!providerKey || publication.providerSlug === providerKey)
    && (!filters?.type || publication.serviceType === filters.type)
    && (!filters?.budget || publication.pricePerPerson < 50)
    && (!filters?.date && !filters?.people || publication.departures?.some(d =>
      d.available >= (filters?.people || 1) && (!filters?.date || new Intl.DateTimeFormat('en-CA', {timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d.startAt)) === filters.date)))
    && matchesQuery(`${publication.title} ${publication.destination} ${publication.description}`, searchQuery),
  ), [filters?.budget, filters?.date, filters?.people, filters?.type, providerKey, publications, searchQuery]);

  const visiblePublications = useMemo(
    () => baseVisiblePublications.filter((publication) => matchesAdvancedFilters(publication, advancedFilters)),
    [advancedFilters, baseVisiblePublications],
  );

  const destinationOptions = useMemo(
    () => Array.from(
      new Set(
        baseVisiblePublications
          .map((publication) => publication.destination?.trim())
          .filter((destination): destination is string => Boolean(destination)),
      ),
    ).sort((a, b) => a.localeCompare(b, "es")),
    [baseVisiblePublications],
  );

  const priceBounds = useMemo(() => {
    if (baseVisiblePublications.length === 0) {
      return { min: 0, max: 100 };
    }

    const prices = baseVisiblePublications
      .map((publication) => publication.pricePerPerson)
      .filter((price) => Number.isFinite(price));

    if (prices.length === 0) {
      return { min: 0, max: 100 };
    }

    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));

    return {
      min,
      max: Math.max(min + 1, max),
    };
  }, [baseVisiblePublications]);

  const draftMinPrice =
    draftFilters.minPrice === ""
      ? priceBounds.min
      : Math.max(
          priceBounds.min,
          Math.min(Number(draftFilters.minPrice), priceBounds.max),
        );

  const draftMaxPrice =
    draftFilters.maxPrice === ""
      ? priceBounds.max
      : Math.max(
          draftMinPrice,
          Math.min(Number(draftFilters.maxPrice), priceBounds.max),
        );

  const filteredDestinationOptions = useMemo(
    () => destinationOptions.filter((destination) =>
      destination.toLocaleLowerCase().includes(destinationSearch.trim().toLocaleLowerCase())),
    [destinationOptions, destinationSearch],
  );

  const draftResultCount = useMemo(
    () => baseVisiblePublications.filter((publication) => matchesAdvancedFilters(publication, draftFilters)).length,
    [baseVisiblePublications, draftFilters],
  );

  const [firstRow, secondRow] = useMemo(
    () => splitIntoTwoRows(visiblePublications),
    [visiblePublications],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.destination.trim()) count += 1;
    if (advancedFilters.minPrice !== "" || advancedFilters.maxPrice !== "") count += 1;
    count += advancedFilters.serviceTypes.length;
    count += advancedFilters.durations.length;
    if (advancedFilters.availableOnly) count += 1;
    return count;
  }, [advancedFilters]);

  const filterResetKey = JSON.stringify({
    ...advancedFilters,
    searchQuery,
    type: filters?.type ?? "",
    budget: Boolean(filters?.budget),
    date: filters?.date ?? "",
    people: filters?.people ?? 0,
  });

  const allExperiencesHref = useMemo(() => {
    const params = new URLSearchParams();
    const destinationQuery = advancedFilters.destination.trim() || searchQuery.trim();

    if (destinationQuery) params.set("search", destinationQuery);
    if (filters?.type) params.set("type", filters.type);
    if (!filters?.type && advancedFilters.serviceTypes.length === 1) {
      params.set("type", advancedFilters.serviceTypes[0]);
    }
    if (advancedFilters.minPrice) params.set("minPrice", advancedFilters.minPrice);
    if (advancedFilters.maxPrice) params.set("maxPrice", advancedFilters.maxPrice);
    if (advancedFilters.durations.length > 0) params.set("durations", advancedFilters.durations.join(","));
    if (advancedFilters.availableOnly) params.set("available", "1");
    if (filters?.budget) params.set("maxPrice", "50");
    if (filters?.date) params.set("date", filters.date);
    if (filters?.people) params.set("people", String(filters.people));

    const query = params.toString();
    return query ? `/experiencias?${query}` : "/experiencias";
  }, [advancedFilters, filters?.budget, filters?.date, filters?.people, filters?.type, searchQuery]);

  const providerName = providerKey ? visiblePublications[0]?.providerName : undefined;

  async function toggleSaved(publication: TravelerPublication) {
    const isSaved = savedIds.includes(publication.id);
    try {
      await setPublicationSaved(publication.id, !isSaved);
      setSavedIds((current) => isSaved
        ? current.filter((id) => id !== publication.id)
        : [...current, publication.id]);
    } catch (cause) {
      setLoadError({
        provider: providerKey,
        message: cause instanceof Error ? cause.message : "No se pudo actualizar Guardados.",
      });
    }
  }

  function openFilters() {
    setDraftFilters(advancedFilters);
    setDestinationSearch("");
    setFilterPanelOpen(true);
  }

  function closeFilters() {
    setDraftFilters(advancedFilters);
    returnFocusRef.current = true;
    setFilterPanelOpen(false);
  }

  function clearDraftFilters() {
    setDraftFilters(EMPTY_ADVANCED_FILTERS);
  }

  function applyFilters() {
    const min = draftFilters.minPrice === "" ? null : Number(draftFilters.minPrice);
    const max = draftFilters.maxPrice === "" ? null : Number(draftFilters.maxPrice);
    if (min !== null && max !== null && min > max) return;
    setAdvancedFilters(draftFilters);
    returnFocusRef.current = true;
    setFilterPanelOpen(false);
  }

  function updateDraftPrice(field: "minPrice" | "maxPrice", input: string) {
    if (input !== "" && (!Number.isFinite(Number(input)) || Number(input) < 0)) return;
    setDraftFilters((current) => ({ ...current, [field]: input }));
  }

  function validateDraftPrice(field: "minPrice" | "maxPrice") {
    setDraftFilters((current) => {
      const value = current[field];
      if (value === "") return current;
      const numeric = Math.min(priceBounds.max, Math.max(priceBounds.min, Number(value)));
      const opposite = field === "minPrice" ? "maxPrice" : "minPrice";
      const oppositeValue = current[opposite] === "" ? null : Number(current[opposite]);
      const normalized = oppositeValue === null ? numeric :
        field === "minPrice" ? Math.min(numeric, oppositeValue) : Math.max(numeric, oppositeValue);
      return { ...current, [field]: String(normalized) };
    });
  }

  function clearAppliedFilters() {
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
    setDraftFilters(EMPTY_ADVANCED_FILTERS);
  }

  function toggleDraftService(serviceType: LandingServiceFilter) {
    setDraftFilters((current) => ({
      ...current,
      serviceTypes: current.serviceTypes.includes(serviceType)
        ? current.serviceTypes.filter((item) => item !== serviceType)
        : [...current.serviceTypes, serviceType],
    }));
  }

  function toggleDraftDuration(duration: LandingDurationFilter) {
    setDraftFilters((current) => ({
      ...current,
      durations: current.durations.includes(duration)
        ? current.durations.filter((item) => item !== duration)
        : [...current.durations, duration],
    }));
  }

  function removeServiceFilter(serviceType: LandingServiceFilter) {
    setAdvancedFilters((current) => ({
      ...current,
      serviceTypes: current.serviceTypes.filter((item) => item !== serviceType),
    }));
  }

  function removeDurationFilter(duration: LandingDurationFilter) {
    setAdvancedFilters((current) => ({
      ...current,
      durations: current.durations.filter((item) => item !== duration),
    }));
  }

  return (
    <section id={embedded ? "experiencias" : undefined} className={embedded ? "catalog-embedded" : "page-shell"}>
      {!embedded && <TripHeading
        eyebrow={t("Mi viaje")}
        title={providerName ? `${t("Viajes de")} ${providerName}` : t("Explorar")}
        lead={t("Encuentra experiencias y servicios para armar tu próxima ruta.")}
      />}
      {!embedded &&
      <label className="search-panel" style={{ margin: "1.5rem 0", maxWidth: 640, gridTemplateColumns: "1fr" }}>
        <span className="sr-only">{t("Buscar experiencias")}</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Buscar por experiencia o destino")}
        />
      </label>}
      {savedError && <p className="notice" role="status">{t(savedError)}</p>}
      {!embedded && !loading && !error && <p role="status">{visiblePublications.length}{t(" servicios encontrados.")}</p>}
      {error ? <div className="notice" role="alert"><p>{t(error)}</p><button className="button button-outline" onClick={() => setRetry(n => n + 1)}>{t("Volver a intentar")}</button></div> : null}
      <CurrencyNotice />

      {embedded && discovery && !loading && !error ? (
        <>
          <div className="landing-catalog-toolbar">
            <div className="landing-catalog-toolbar-spacer" aria-hidden="true" />

            <div className="landing-catalog-toolbar-actions">
              <button type="button" className="landing-catalog-control" ref={filterTriggerRef} onClick={openFilters}>
                <SlidersHorizontal size={17} aria-hidden="true" />
                <span>{t("Filtros")}</span>
                {activeFilterCount > 0 ? <span className="landing-filter-count">{activeFilterCount}</span> : null}
              </button>

              <button
                type="button"
                className="landing-catalog-control landing-sort-placeholder"
                title={t("El ordenamiento estará disponible próximamente")}
                aria-label={t("Ordenar por: Recomendados. Disponible próximamente")}
              >
                <span>{t("Ordenar por: Recomendados")}</span>
                <ChevronDown size={17} aria-hidden="true" />
              </button>
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <div className="landing-active-filters" aria-label={t("Filtros activos")}>
              {advancedFilters.destination.trim() ? (
                <button type="button" onClick={() => setAdvancedFilters((current) => ({ ...current, destination: "" }))}>
                  {t("Destino")}: {advancedFilters.destination}<X size={12} aria-hidden="true" />
                </button>
              ) : null}

              {advancedFilters.minPrice !== "" || advancedFilters.maxPrice !== "" ? (
                <button type="button" onClick={() => setAdvancedFilters((current) => ({ ...current, minPrice: "", maxPrice: "" }))}>
                  {t("Precio")}: {advancedFilters.minPrice || "0"}–{advancedFilters.maxPrice || "∞"} USD<X size={12} aria-hidden="true" />
                </button>
              ) : null}

              {advancedFilters.serviceTypes.map((serviceType) => (
                <button type="button" key={serviceType} onClick={() => removeServiceFilter(serviceType)}>
                  {t(serviceType === "TRANSPORT" ? "Transporte" : "Excursión")}<X size={12} aria-hidden="true" />
                </button>
              ))}

              {advancedFilters.durations.map((duration) => (
                <button type="button" key={duration} onClick={() => removeDurationFilter(duration)}>
                  {t(DURATION_LABELS[duration])}<X size={12} aria-hidden="true" />
                </button>
              ))}

              {advancedFilters.availableOnly ? (
                <button type="button" onClick={() => setAdvancedFilters((current) => ({ ...current, availableOnly: false }))}>
                  {t("Solo con próximas salidas")}<X size={12} aria-hidden="true" />
                </button>
              ) : null}

              <button type="button" className="landing-active-filters-clear" onClick={clearAppliedFilters}>
                {t("Limpiar todo")}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {loading ? (
        <p className="empty-state">{t("Cargando publicaciones...")}</p>
      ) : visiblePublications.length > 0 ? (
        embedded && discovery ? (
          <>
            <div className="landing-publication-rows">
              <LandingPublicationCarouselRow
                publications={firstRow}
                savedIds={savedIds}
                canSave={user?.role === "Viajero"}
                onToggleSaved={toggleSaved}
                resetKey={`${filterResetKey}-row-1`}
              />

              {secondRow.length > 0 ? (
                <LandingPublicationCarouselRow
                  publications={secondRow}
                  savedIds={savedIds}
                  canSave={user?.role === "Viajero"}
                  onToggleSaved={toggleSaved}
                  resetKey={`${filterResetKey}-row-2`}
                />
              ) : null}
            </div>

            <div className="landing-view-all-row">
              <Link href={allExperiencesHref} className="landing-view-all-link">
                {t("Ver todas las experiencias")} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        ) : (
          <div className="card-grid">
            {visiblePublications.map((publication) => (
              <TravelerTripCard
                key={publication.id}
                publication={publication}
                compact={discovery}
                saved={savedIds.includes(publication.id)}
                onToggleSaved={user?.role === "Viajero" ? () => void toggleSaved(publication) : undefined}
              />
            ))}
          </div>
        )
      ) : (
        <div className="landing-no-results">
          <p className="empty-state">
            {error ? t("No se pudieron cargar las publicaciones.") : t("No encontramos viajes con esos filtros.")}
          </p>
          {!error && activeFilterCount > 0 ? (
            <button type="button" className="button button-outline" onClick={clearAppliedFilters}>
              {t("Limpiar filtros")}
            </button>
          ) : null}
        </div>
      )}

      {filterPanelOpen ? (
        <div className="landing-filter-overlay" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) closeFilters();
        }}>
          <aside ref={filterDialogRef} className="landing-filter-panel" role="dialog" aria-modal="true" aria-labelledby="landing-filter-title">
            <div className="landing-filter-panel-header">
              <div className="landing-filter-heading-copy">
                <h2 id="landing-filter-title">{t("Filtros")}</h2>
                <p className="landing-filter-subtitle">{t("Personaliza tu próxima experiencia")}</p>
              </div>
              <button type="button" className="landing-filter-close" ref={filterCloseRef} onClick={closeFilters} aria-label={t("Cerrar filtros")}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="landing-filter-panel-body">
              <label className="landing-filter-field landing-filter-destination">
                <span>{t("Destino")}</span>
                {destinationOptions.length > 8 ? (
                  <input
                    type="search"
                    className="landing-filter-destination-search"
                    value={destinationSearch}
                    placeholder={t("Buscar destino")}
                    aria-label={t("Buscar destino")}
                    onChange={(event) => setDestinationSearch(event.target.value)}
                  />
                ) : null}
                <select
                  value={draftFilters.destination}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      destination: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("Todos los destinos")}</option>
                  {draftFilters.destination && !filteredDestinationOptions.includes(draftFilters.destination) ? (
                    <option value={draftFilters.destination}>{draftFilters.destination}</option>
                  ) : null}
                  {filteredDestinationOptions.map((destinationOption) => (
                    <option key={destinationOption} value={destinationOption}>
                      {destinationOption}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="landing-filter-group landing-filter-group-price">
                <legend>{t("Precio por persona")}</legend>

                <div className="landing-filter-range-wrap">
                  <div className="landing-filter-range" aria-label={t("Rango de precio por persona")}>
                    <div className="landing-filter-range-track" />
                    <div
                      className="landing-filter-range-selected"
                      style={{
                        left: `${((draftMinPrice - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%`,
                        right: `${100 - ((draftMaxPrice - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      step="1"
                      value={draftMinPrice}
                      aria-label={t("Precio mínimo")}
                      onChange={(event) => {
                        const next = Math.min(Number(event.target.value), draftMaxPrice);
                        setDraftFilters((current) => ({
                          ...current,
                          minPrice: String(next),
                        }));
                      }}
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      step="1"
                      value={draftMaxPrice}
                      aria-label={t("Precio máximo")}
                      onChange={(event) => {
                        const next = Math.max(Number(event.target.value), draftMinPrice);
                        setDraftFilters((current) => ({
                          ...current,
                          maxPrice: String(next),
                        }));
                      }}
                    />
                  </div>

                </div>

                <div className="landing-filter-price-grid">
                  <label>
                    <span>{t("Mínimo (USD)")}</span>
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={draftMaxPrice}
                      step="1"
                      inputMode="decimal"
                      value={draftFilters.minPrice}
                      placeholder={String(priceBounds.min)}
                      onChange={(event) => updateDraftPrice("minPrice", event.target.value)}
                      onBlur={() => validateDraftPrice("minPrice")}
                    />
                  </label>

                  <label>
                    <span>{t("Máximo (USD)")}</span>
                    <input
                      type="number"
                      min={draftMinPrice}
                      max={priceBounds.max}
                      step="1"
                      inputMode="decimal"
                      value={draftFilters.maxPrice}
                      placeholder={String(priceBounds.max)}
                      onChange={(event) => updateDraftPrice("maxPrice", event.target.value)}
                      onBlur={() => validateDraftPrice("maxPrice")}
                    />
                  </label>
                </div>
                <p className="landing-filter-converted-price" aria-live="polite">
                  {money(draftMinPrice)} — {money(draftMaxPrice)}
                </p>
              </fieldset>

              <fieldset className="landing-filter-group">
                <legend>{t("Tipo de servicio")}</legend>
                <div className="landing-filter-check-options">
                  {(["EXCURSION", "TRANSPORT"] as const).map((serviceType) => {
                    const selected = draftFilters.serviceTypes.includes(serviceType);
                    return (
                      <label key={serviceType} className="landing-filter-check-row">
                        <input type="checkbox" checked={selected} onChange={() => toggleDraftService(serviceType)} />
                        <span>{t(serviceType === "TRANSPORT" ? "Transporte" : "Excursión")}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="landing-filter-group">
                <legend>{t("Duración")}</legend>
                <div className="landing-filter-check-options">
                  {(["SHORT", "HALF", "FULL"] as const).map((duration) => {
                    const selected = draftFilters.durations.includes(duration);
                    return (
                      <label key={duration} className="landing-filter-check-row">
                        <input type="checkbox" checked={selected} onChange={() => toggleDraftDuration(duration)} />
                        <span>{t(DURATION_LABELS[duration])}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="landing-filter-group">
                <legend>{t("Disponibilidad")}</legend>
                <button
                  type="button"
                  className={`landing-filter-availability${draftFilters.availableOnly ? " is-selected" : ""}`}
                  aria-pressed={draftFilters.availableOnly}
                  onClick={() => setDraftFilters((current) => ({ ...current, availableOnly: !current.availableOnly }))}
                >
                  <span>{t("Solo con próximas salidas")}</span>
                  {draftFilters.availableOnly ? <Check size={15} aria-hidden="true" /> : null}
                </button>
              </fieldset>
            </div>

            <div className="landing-filter-panel-footer">
              <button type="button" className="landing-filter-clear" onClick={clearDraftFilters}>{t("Limpiar filtros")}</button>
              <button type="button" className="landing-filter-apply" onClick={applyFilters}>
                {draftResultCount === 0 ? t("Sin resultados") : <>{t("Ver")} {draftResultCount} {t(draftResultCount === 1 ? "experiencia" : "experiencias")}</>}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function LandingPublicationCarouselRow({
  publications,
  savedIds,
  canSave,
  onToggleSaved,
  resetKey,
}: {
  publications: TravelerPublication[];
  savedIds: string[];
  canSave: boolean;
  onToggleSaved: (publication: TravelerPublication) => Promise<void>;
  resetKey: string;
}) {
  const { t } = usePreferences();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [canGoPrevious, setCanGoPrevious] = useState(false);
  const [canGoNext, setCanGoNext] = useState(false);

  function updateControls() {
    const row = rowRef.current;
    if (!row) return;

    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
    setCanGoPrevious(row.scrollLeft > 2);
    setCanGoNext(row.scrollLeft < maxScrollLeft - 2);
  }

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    row.scrollTo({ left: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(updateControls);

    function handleResize() {
      updateControls();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [publications.length, resetKey]);

  function moveRow(direction: "previous" | "next") {
    const row = rowRef.current;
    if (!row) return;

    row.scrollBy({
      left: direction === "next" ? row.clientWidth : -row.clientWidth,
      behavior: "smooth",
    });
  }

  if (publications.length === 0) return null;

  return (
    <div className="landing-publication-carousel">
      <button
        type="button"
        className="landing-publication-arrow landing-publication-arrow-left"
        aria-label={t("Ver publicaciones anteriores")}
        onClick={() => moveRow("previous")}
        disabled={!canGoPrevious}
      >
        <ChevronLeft size={26} aria-hidden="true" />
      </button>

      <div ref={rowRef} className="landing-publication-row" onScroll={updateControls}>
        {publications.map((publication) => (
          <TravelerTripCard
            key={publication.id}
            publication={publication}
            compact
            saved={savedIds.includes(publication.id)}
            onToggleSaved={canSave ? () => void onToggleSaved(publication) : undefined}
          />
        ))}
      </div>

      <button
        type="button"
        className="landing-publication-arrow landing-publication-arrow-right"
        aria-label={t("Ver más publicaciones")}
        onClick={() => moveRow("next")}
        disabled={!canGoNext}
      >
        <ChevronRight size={26} aria-hidden="true" />
      </button>
    </div>
  );
}

export function TravelerSavedPage() {
  const { t } = usePreferences();
  const [publications, setPublications] = useState<TravelerPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSavedPublications()
      .then((data) => {
        if (!cancelled) setPublications(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus publicaciones guardadas.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function removeSaved(publication: TravelerPublication) {
    try {
      await setPublicationSaved(publication.id, false);
      setPublications((current) => current.filter((item) => item.id !== publication.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo quitar la publicación de Guardados.");
    }
  }

  return (
    <section className="page-shell trip-page-shell">
      <TripHeading
        eyebrow={t("Mi viaje")}
        title={t("Guardados")}
        lead={t("Ideas de viaje que quieres revisar antes de reservar.")}
      />
      {error ? <p className="notice" role="alert">{t(error)}</p> : null}
      <CurrencyNotice /><div className="card-grid">
        {loading ? <p className="empty-state">{t("Cargando publicaciones guardadas...")}</p>
          : error && publications.length === 0 ? null : publications.length > 0
            ? publications.map((publication) => (
              <TravelerTripCard
                key={publication.id}
                publication={publication}
                saved
                onToggleSaved={() => void removeSaved(publication)}
              />
            ))
            : <p className="empty-state">{t("Aún no tienes publicaciones guardadas.")}</p>}
      </div>
    </section>
  );
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Por confirmar",
  CONFIRMED: "Confirmada",
  PAST: "Pasada",
  CANCELLED: "Cancelada",
};

export function TravelerReservationsPage() {
  const { t } = usePreferences();
  const searchParams = useSearchParams();
  const selectedReservation = searchParams.get("reserva");
  const [reservationView, setReservationView] = useState<"upcoming" | "past">("upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !selectedReservation || reservationView !== "upcoming") return;
    const card = document.getElementById(`reserva-${selectedReservation}`);
    if (card) {
      card.setAttribute("tabindex", "-1");
      card.focus({ preventScroll: true });
      card.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [loading, selectedReservation, reservationView]);

  useEffect(() => {
    let cancelled = false;
    listReservations()
      .then((data) => {
        if (!cancelled) setReservations(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las reservas.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleReservations = reservations.filter((reservation) =>
    reservationView === "upcoming"
      ? reservation.status === "PENDING" || reservation.status === "CONFIRMED"
      : reservation.status === "PAST" || reservation.status === "CANCELLED",
  );

  async function saveRating(reservationId: string, rating: number) {
    const savedRating = await rateReservation(reservationId, rating);
    setReservations((current) => current.map((reservation) =>
      reservation.id === reservationId ? { ...reservation, rating: savedRating } : reservation,
    ));
  }

  async function cancelReservation(reservation: Reservation) {
    const confirmation = await Swal.fire({
      title: t("¿Cancelar viaje?"),
      text: `${t("¿Cancelar esta reserva?")} ${reservation.publicationTitle}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Sí, cancelar viaje"),
      cancelButtonText: t("Mantener reserva"),
      reverseButtons: true,
      buttonsStyling: false,
      customClass: reservationAlertClasses,
    });
    if (!confirmation.isConfirmed) return;

    setCancellingReservationId(reservation.id);
    let updated: Reservation;
    try {
      updated = await updateReservation(reservation.id, { status: "CANCELLED" });
    } catch (cause) {
      await Swal.fire({
        title: t("No se pudo cancelar el viaje"),
        text: cause instanceof Error ? cause.message : "Intenta de nuevo en unos momentos.",
        icon: "error",
        confirmButtonText: t("Cerrar"),
        buttonsStyling: false,
        customClass: reservationAlertClasses,
      });
      return;
    } finally {
      setCancellingReservationId(null);
    }
    setReservations((current) => current.map((item) =>
      item.id === updated.id ? updated : item,
    ));
    await Swal.fire({
      title: t("Viaje cancelado"),
      text: t("Tu reserva se canceló correctamente."),
      icon: "success",
      confirmButtonText: t("Aceptar"),
      buttonsStyling: false,
      customClass: reservationAlertClasses,
    });
  }

  return (
    <section className="page-shell trip-page-shell">
      <TripHeading
        eyebrow={t("Mi viaje")}
        title={t("Mis reservas")}
        lead={t("Revisa tus viajes reservados y la información de cada experiencia.")}
      />
      {error ? (
        <p className="notice" role="alert">{t(error)}</p>
      ) : null}
      {searchParams.get("existente") === "1" && <p className="notice" role="status">{t("Ya tienes una reserva para esta salida. No creamos una segunda reserva.")}</p>}
      <div className="filter-row" role="tablist" aria-label={t("Filtrar reservas")}>
        <button
          type="button"
          role="tab"
          className={reservationView === "upcoming" ? "chip chip-active" : "chip"}
          aria-selected={reservationView === "upcoming"}
          onClick={() => setReservationView("upcoming")}
        >{t("Por venir ")}</button>
        <button
          type="button"
          role="tab"
          className={reservationView === "past" ? "chip chip-active" : "chip"}
          aria-selected={reservationView === "past"}
          onClick={() => setReservationView("past")}
        >{t("Historial ")}</button>
      </div>
      {reservationView === "upcoming" ? <section aria-labelledby="upcoming-reservations-title">
        <h2 id="upcoming-reservations-title" className="subheading">{t("Reservas por venir")}</h2>
        {visibleReservations.length === 0 ? <p className="empty-state">{t(loading ? "Cargando reservas..." : error ? "El listado no está disponible." : "No tienes reservas por venir.")}</p> :
          <div className="booking-list upcoming-reservations">{visibleReservations.map(reservation =>
            <UpcomingReservationCard key={reservation.id} reservation={reservation}
              onCancel={() => void cancelReservation(reservation)} busy={cancellingReservationId !== null} />
          )}</div>}
      </section> : <ReservationGroup
        title={t("Historial de reservas")}
        emptyLabel={
          loading
            ? t("Cargando reservas...")
            : error
              ? t("El listado no está disponible.")
              : t("No tienes reservas en el historial.")
        }
        reservations={visibleReservations}
        onRate={saveRating}
        onCancel={cancelReservation}
        cancellingReservationId={cancellingReservationId}
      />}
    </section>
  );
}

function TravelerTripCard({
  publication,
  compact = false,
  saved = false,
  onToggleSaved,
}: {
  publication: TravelerPublication;
  compact?: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const { t, money, dateLabel } = usePreferences();
  const { user } = useAuth();
  if (compact) {
    const href = `/experiencias/${publication.id}`;
    const departure = publication.departures?.find(
      (item) => item.available > 0,
    );

    /*
     * La proyección pública actual todavía no expone
     * una calificación agregada. La UI queda preparada
     * para mostrarla si el catálogo la incorpora después,
     * sin inventar datos.
     */
    const ratingData = publication as TravelerPublication & {
      ratingAverage?: number | null;
      ratingCount?: number | null;
    };

    const hasRating =
      typeof ratingData.ratingAverage === "number" &&
      Number.isFinite(ratingData.ratingAverage);

    return (
      <article className="discovery-trip-card">
        <div className="discovery-trip-image">
          <Link href={href} aria-label={publication.title}>
            {publication.mainImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={publication.mainImageUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="discovery-trip-placeholder">{t("Sin imagen")}</span>
            )}
          </Link>

          {onToggleSaved ? (
            <button
              type="button"
              className="discovery-save"
              aria-pressed={saved}
              aria-label={
                saved
                  ? `${t("Quitar de Guardados")}: ${publication.title}`
                  : `${t("Guardar")}: ${publication.title}`
              }
              onClick={onToggleSaved}
            >
              <Heart size={20} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          ) : !user ? (
            <Link
              className="discovery-save"
              href={`/login?next=${encodeURIComponent(href)}`}
              aria-label={`${t("Guardar")}: ${publication.title}`}
            >
              <Heart size={20} aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <div className="discovery-trip-content">
          <h3>
            <Link href={href}>{publication.title}</Link>
          </h3>

          <p className="discovery-trip-location">
            <MapPin size={16} strokeWidth={2} aria-hidden="true" />
            <span>{publication.destination}</span>
          </p>

          <p className="discovery-trip-meta">
            {t(publication.serviceType === "TRANSPORT" ? "Transporte" : "Excursión")}
            {" · "}
            {publication.durationMinutes} {t("min")}
          </p>

          {hasRating ? (
            <p className="discovery-trip-rating">
              <Star size={18} fill="currentColor" aria-hidden="true" />
              <strong>{ratingData.ratingAverage!.toFixed(1)}</strong>
              {typeof ratingData.ratingCount === "number" ? (
                <span>({ratingData.ratingCount})</span>
              ) : null}
            </p>
          ) : null}

          <p className="discovery-trip-availability">
            {departure
              ? `${t("Próxima salida:")} ${dateLabel(departure.startAt)}`
              : t("Por ahora no hay nuevas fechas disponibles.")}
          </p>

          <p className="discovery-trip-price">
            <strong>{money(publication.pricePerPerson)}</strong>
            <span>{t("por persona")}</span>
          </p>
        </div>
      </article>
    );
  }
  return (
    <article className="experience-card">
      <div className="card-image-wrap">
        {publication.mainImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={publication.mainImageUrl} alt={publication.title} loading="lazy" decoding="async" />
        ) : (
          <p className="empty-state">{t("Sin imagen")}</p>
        )}
        {onToggleSaved ? (
          <button
            type="button"
            className="save-button"
            aria-pressed={saved}
            aria-label={saved ? `Quitar ${publication.title} de Guardados` : `Guardar ${publication.title}`}
            onClick={onToggleSaved}
          >
            {saved ? t("Guardado ♥") : t("Guardar ♡")}
          </button>
        ) : null}
      </div>
      <div className="card-body">
        <p className="card-place">{publication.destination}</p>
        <h3>{publication.title}</h3>
        <p className="trip-departure-info">
          {publication.departures?.find(d => d.available > 0)
            ? <>{t("Próxima salida: ")}{dateLabel(publication.departures.find(d => d.available > 0)!.startAt)} · {publication.departures.find(d => d.available > 0)!.available}{t(" cupos disponibles (hora de Costa Rica).")}</>
            : publication.departures?.length ? t("Las salidas publicadas están completas. Consulta otras fechas.")
            : t("Por ahora no hay nuevas fechas disponibles.")}
        </p>
        <p>{publication.description}</p>
        <div className="card-footer">
          <strong>{money(publication.pricePerPerson)}{t(" por persona ")}<span>· {publication.durationMinutes}{t(" min")}</span></strong>
          <div className="trip-actions">
            <Link className="button button-primary" href={`/experiencias/${publication.id}`}>{publication.departures?.some(d => d.available > 0) ? t("Ver fechas y reservar") : t("Ver detalles")}</Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function ReservationGroup({
  title,
  emptyLabel,
  reservations,
  onRate,
  onCancel,
  cancellingReservationId,
}: {
  title: string;
  emptyLabel: string;
  reservations: Reservation[];
  onRate: (reservationId: string, rating: number) => Promise<void>;
  onCancel: (reservation: Reservation) => Promise<void>;
  cancellingReservationId: string | null;
}) {
  const { t, dateLabel } = usePreferences();
  const headingId = title.replaceAll(" ", "-").toLowerCase();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="subheading">{t(title)}</h2>
      {reservations.length === 0 ? (
        <p className="empty-state">{t(emptyLabel)}</p>
      ) : reservations.map((reservation) => {
        const people = reservation.numberOfPeople === 1
          ? t("1 persona")
          : `${reservation.numberOfPeople} ${t("personas")}`;
        const place = reservation.destination ?? t("Sin destino");
        return (
          <article className="reservation-card" key={reservation.id}>
            <div>
              <p>{dateLabel(reservation.departureStartAt)}</p>
              <h3>{reservation.publicationTitle}</h3>
              <p>{people} · {place}</p>
            </div>
            <div className="trip-actions">
              <span className="badge" style={{ position: "static" }}>{t(STATUS_LABEL[reservation.status])}</span>
              {reservation.publicationId ? (
                <Link className="button button-outline" href={tripPath("detalle", { publicacion: reservation.publicationId })}>{t("Ver detalles ")}</Link>
              ) : null}
              {reservation.status === "PENDING" || reservation.status === "CONFIRMED" ? (
                <button
                  type="button"
                  className="button button-danger"
                  disabled={cancellingReservationId !== null}
                  aria-busy={cancellingReservationId === reservation.id}
                  onClick={() => void onCancel(reservation)}
                >
                  {cancellingReservationId === reservation.id ? t("Cancelando...") : t("Cancelar viaje")}
                </button>
              ) : null}
              {reservation.status === "PAST" ? (
                <ReservationRating reservation={reservation} onRate={onRate} />
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ReservationRating({
  reservation,
  onRate,
}: {
  reservation: Reservation;
  onRate: (reservationId: string, rating: number) => Promise<void>;
}) {
  const { t } = usePreferences();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(rating: number) {
    setSaving(true);
    setError(null);
    try {
      await onRate(reservation.id, rating);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la calificación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="reservation-rating">
      <span>{reservation.rating ? t("Tu calificación") : t("Califica este viaje")}</span>
      <div className="rating-stars" role="group" aria-label={`Calificación de ${reservation.publicationTitle}`}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={saving}
            aria-label={`${rating} ${rating === 1 ? "estrella" : "estrellas"}`}
            aria-pressed={reservation.rating === rating}
            onClick={() => void submit(rating)}
          >
            {reservation.rating != null && rating <= reservation.rating ? "★" : "☆"}
          </button>
        ))}
      </div>
      {error ? <p role="alert">{t(error)}</p> : null}
    </div>
  );
}

export function TravelerDetailsPage({ publicationId }: { publicationId: string }) {
  return <ExperienceDetail key={publicationId} id={publicationId} embedded />;
}

export function TravelerPurchasePage({ publicationId }: { publicationId: string }) {
  return <ExperienceDetail key={publicationId} id={publicationId} embedded />;
}

export function TravelerProfilePage() {
  return <MyProfilePage appearance="landing" />;
}

export function TravelerProfileForm({
  profile,
  onSave,
  onDelete,
  saved,
}: {
  profile: SystemUser;
  onSave: (value: { name: string; email: string; phone: string }) => void;
  onDelete: () => void;
  saved: boolean;
}) {
  const { t } = usePreferences();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="page-shell">
      <TripHeading
        eyebrow={t("Mi viaje")}
        title={t("Mi usuario")}
        lead={t("Aquí puedes revisar y actualizar tus datos personales.")}
      />
      <form
        className="editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            name: name.trim() || "Usuario sin nombre",
            email: email.trim(),
            phone: phone.trim(),
          });
        }}
      >
        <h2 className="subheading">{t("Mis datos")}</h2>
        <p>{t("Esta información se usará para tus reservas y comunicaciones.")}</p>
        <label>
          <span>{t("Nombre completo")}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>{t("Correo electrónico")}</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>{t("Teléfono")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t("+506 0000-0000")} />
        </label>
        <div className="form-actions">
          {saved ? <p role="status">{t("Tus datos fueron actualizados.")}</p> : null}
          <Link className="button button-outline" href="/forgot-password">{t("Cambiar contraseña")}</Link>
          <button className="button button-primary" type="submit">{t("Guardar cambios")}</button>
          <button className="button button-outline" type="button" onClick={() => setDeleteOpen(true)}>{t("Eliminar cuenta")}</button>
        </div>
      </form>
      <p className="notice">{t("Tus datos están protegidos y solo se comparten cuando los necesitas para una reserva.")}</p>
      {deleteOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title">{t("¿Seguro que quieres eliminar tu cuenta?")}</h2>
            <p>{t("Esta acción eliminará tu perfil y no podrás usarlo para tus reservas.")}</p>
            <div className="form-actions">
              <button className="button button-outline" type="button" onClick={() => setDeleteOpen(false)}>{t("Cancelar")}</button>
              <button className="button button-primary" type="button" onClick={onDelete}>{t("Sí, eliminar cuenta")}</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
