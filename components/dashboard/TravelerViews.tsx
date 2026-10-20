"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { Heart } from "lucide-react";
import { CurrencyNotice } from "@/components/preferences/PreferenceControls";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { ExperienceDetail } from "@/modules/booking/ExperienceDetail";
import { UpcomingReservationCard } from "@/modules/booking/UpcomingReservationCard";
import { canTravelerCancel, isUpcomingReservation, reservationNotice, reservationStatusText } from "@/modules/booking/reservationState";
import { useNow } from "@/modules/booking/useNow";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SystemUser } from "@/modules/crm/users/models/User";
import { MyProfilePage } from "@/modules/crm/users/components/MyProfilePage";
import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";
import { matchesQuery } from "@/modules/landing/lib/searchText";
import {
  listSavedPublications,
  listCatalogPublications,
  getTravelerPublication,
  listSavedPublicationIds,
  rateReservation,
  setPublicationSaved,
} from "@/modules/traveler/services/traveler.service";
import {
  listReservations,
  updateReservation,
  type Reservation,
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

export function TravelerExplorePage({ embedded = false, discovery = false, filters }: { embedded?: boolean; discovery?: boolean; filters?: { destination:string; date:string; people:number; type:string; budget:boolean } } = {}) {
  const { t } = usePreferences();
  const { user } = useAuth();
  const [retry, setRetry] = useState(0);
  const [savedError, setSavedError] = useState("");
  const provider = useSearchParams().get("provider");
  const [search, setSearch] = useState("");
  const [publications, setPublications] = useState<TravelerPublication[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loadedProvider, setLoadedProvider] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ provider: string; message: string } | null>(null);
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

  const searchQuery = filters?.destination ?? search;
  const visiblePublications = publications.filter((publication) =>
    (!providerKey || publication.providerSlug === providerKey)
    && (!filters?.type || publication.serviceType === filters.type)
    && (!filters?.budget || publication.pricePerPerson < 50)
    && (!filters?.date && !filters?.people || publication.departures?.some(d =>
      d.available >= (filters?.people || 1) && (!filters?.date || new Intl.DateTimeFormat('en-CA', {timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d.startAt)) === filters.date)))
    && matchesQuery(`${publication.title} ${publication.destination} ${publication.description}`, searchQuery),
  );
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
      {!loading && !error && <p role="status">{visiblePublications.length}{t(" servicios encontrados.")}</p>}
      {error ? <div className="notice" role="alert"><p>{t(error)}</p><button className="button button-outline" onClick={() => setRetry(n => n + 1)}>{t("Volver a intentar")}</button></div> : null}
      <CurrencyNotice /><div className="card-grid">
        {loading ? (
          <p className="empty-state">{t("Cargando publicaciones...")}</p>
        ) : visiblePublications.length > 0 ? (
          visiblePublications.map((publication) => (
            <TravelerTripCard
              key={publication.id}
              publication={publication}
              compact={discovery}
              saved={savedIds.includes(publication.id)}
              onToggleSaved={user?.role === "Viajero" ? () => void toggleSaved(publication) : undefined}
            />
          ))
        ) : (
          <p className="empty-state">
            {error ? t("No se pudieron cargar las publicaciones.") : t("No encontramos viajes con esa búsqueda.")}
          </p>
        )}
      </div>
    </section>
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

export function TravelerReservationsPage() {
  const { t } = usePreferences();
  const now = useNow();
  const searchParams = useSearchParams();
  const selectedReservation = searchParams.get("reserva");
  const [reservationView, setReservationView] = useState<"upcoming" | "past">("upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [publicationImages, setPublicationImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);
  const alignedSelection = useRef<string | null>(null);
  const focusedSelection = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let request = 0;
    async function load() {
      const id = ++request;
      try {
        const data = await listReservations();
        if (!active || id !== request) return;
        setReservations(data);
        setError(null);
        const images = await publicationImagesFor(data);
        if (!active || id !== request) return;
        setPublicationImages(images);
      } catch (cause: unknown) {
        if (!active || id !== request) return;
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las reservas.");
      } finally {
        if (active && id === request) setLoading(false);
      }
    }
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (loading || !selectedReservation || alignedSelection.current === selectedReservation) return;
    const selected = reservations.find((reservation) => reservation.id === selectedReservation);
    if (!selected) return;
    alignedSelection.current = selectedReservation;
    const upcoming = isUpcomingReservation(selected, now);
    if (upcoming !== (reservationView === "upcoming")) setReservationView(upcoming ? "upcoming" : "past");
  }, [loading, selectedReservation, reservations, now, reservationView]);

  useEffect(() => {
    if (loading || !selectedReservation || focusedSelection.current === selectedReservation) return;
    const card = document.getElementById(`reserva-${selectedReservation}`);
    if (!card) return;
    focusedSelection.current = selectedReservation;
    card.setAttribute("tabindex", "-1");
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "center", behavior: "instant" });
  }, [loading, selectedReservation, reservationView, reservations]);

  const visibleReservations = reservations.filter((reservation) =>
    reservationView === "upcoming"
      ? isUpcomingReservation(reservation, now)
      : !isUpcomingReservation(reservation, now),
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
      <p className="reservation-refresh">{t("El estado se actualiza solo, aproximadamente cada 30 segundos.")}</p>
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
        publicationImages={publicationImages}
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
    const departure = publication.departures?.find(item => item.available > 0);
    return (
      <article className="discovery-trip-card">
        <div className="discovery-trip-image">
          <Link href={href} aria-label={publication.title}>
            {publication.mainImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={publication.mainImageUrl} alt="" loading="lazy" decoding="async" />
            ) : <span className="discovery-trip-placeholder">{t("Sin imagen")}</span>}
          </Link>
          {onToggleSaved ? (
            <button type="button" className="discovery-save" aria-pressed={saved} aria-label={saved ? `${t("Quitar de Guardados")}: ${publication.title}` : `${t("Guardar")}: ${publication.title}`} onClick={onToggleSaved}>
              <Heart size={20} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          ) : !user ? (
            <Link className="discovery-save" href={`/login?next=${encodeURIComponent(href)}`} aria-label={`${t("Guardar")}: ${publication.title}`}><Heart size={20} aria-hidden="true" /></Link>
          ) : null}
        </div>
        <p className="discovery-trip-location">{publication.destination}</p>
        <h3><Link href={href}>{publication.title}</Link></h3>
        <p className="discovery-trip-meta">{t(publication.serviceType === "TRANSPORT" ? "Transporte" : "Excursión")} · {publication.durationMinutes} {t("min")}</p>
        <p className="discovery-trip-availability">{departure ? `${t("Próxima salida:")} ${dateLabel(departure.startAt)}` : t("Por ahora no hay nuevas fechas disponibles.")}</p>
        <p className="discovery-trip-price"><strong>{money(publication.pricePerPerson)}</strong> {t("por persona")}</p>
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

async function publicationImagesFor(reservations: Reservation[]) {
  const images: Record<string, string> = {};
  for (const reservation of reservations) {
    if (reservation.publicationId && reservation.publicationImageUrl) images[reservation.publicationId] = reservation.publicationImageUrl;
  }
  let catalog: TravelerPublication[] = [];
  try {
    catalog = await listCatalogPublications();
  } catch {
    catalog = [];
  }
  for (const publication of catalog) {
    if (publication.mainImageUrl) images[publication.id] = publication.mainImageUrl;
  }
  const missing = [...new Set(reservations.map((reservation) => reservation.publicationId))].filter((id) => id && !images[id]);
  await Promise.all(missing.map(async (publicationId) => {
    try {
      const publication = await getTravelerPublication(publicationId);
      if (publication.mainImageUrl) images[publicationId] = publication.mainImageUrl;
    } catch {
      try {
        const response = await fetch(`/api/catalog?id=${encodeURIComponent(publicationId)}`);
        const body = await response.json() as { data?: { image?: string | null }[] };
        const image = body.data?.[0]?.image;
        if (image) images[publicationId] = image;
      } catch { /* The card keeps the empty image state. */ }
    }
  }));
  return images;
}

function ReservationGroup({
  title,
  emptyLabel,
  reservations,
  publicationImages,
  onRate,
  onCancel,
  cancellingReservationId,
}: {
  title: string;
  emptyLabel: string;
  reservations: Reservation[];
  publicationImages: Record<string, string>;
  onRate: (reservationId: string, rating: number) => Promise<void>;
  onCancel: (reservation: Reservation) => Promise<void>;
  cancellingReservationId: string | null;
}) {
  const { t, money, dateLabel } = usePreferences();
  const now = useNow();
  const headingId = title.replaceAll(" ", "-").toLowerCase();
  return (
    <section className="reservation-history" aria-labelledby={headingId}>
      <h2 id={headingId} className="subheading">{t(title)}</h2>
      {reservations.length === 0 ? (
        <p className="empty-state">{t(emptyLabel)}</p>
      ) : (
        <div className="card-grid">
          {reservations.map((reservation) => {
            const place = reservation.destination ?? t("Sin destino");
            const notice = reservationNotice(reservation, now);
            const image = publicationImages[reservation.publicationId] || reservation.publicationImageUrl;
            return (
              <div className="reservation-history-item" key={reservation.id}>
              <article className="experience-card" id={`reserva-${reservation.id}`}>
                <div className="card-image-wrap">
                  {image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={image} alt={reservation.publicationTitle} loading="lazy" decoding="async" />
                  ) : (
                    <p className="empty-state">{t("Sin imagen")}</p>
                  )}
                  <span className="badge">{t(reservationStatusText(reservation, now))}</span>
                </div>
                <div className="card-body">
                  <p className="card-place">{place}</p>
                  <h3>{reservation.publicationTitle}</h3>
                  <dl className="reservation-facts">
                    <div><dt>{t("Salida · hora de Costa Rica")}</dt><dd>{dateLabel(reservation.departureStartAt)}</dd></div>
                    <div><dt>{t("Personas")}</dt><dd>{reservation.numberOfPeople}</dd></div>
                    <div><dt>{t("Total de la reserva")}</dt><dd>{money(reservation.total)}</dd></div>
                  </dl>
                  <CurrencyNotice usd={reservation.total} />
                  {reservation.meetingPoint ? <p><strong>{t("Punto de encuentro:")}</strong> {reservation.meetingPoint}</p> : null}
                  {reservation.agencyName ? <p><strong>{t("Proveedor:")}</strong> {reservation.agencyName}{reservation.agencyPhone ? ` · ${reservation.agencyPhone}` : ""}{reservation.agencyEmail ? ` · ${reservation.agencyEmail}` : ""}</p> : null}
                  {notice ? <p className="notice">{t(notice)}</p> : null}
                  <div className="card-footer">
                    <div className="trip-actions">
                      {reservation.publicationId ? (
                        <Link className="button button-outline" href={`/experiencias/${reservation.publicationId}`}>{t("Ver experiencia")}</Link>
                      ) : null}
                      {canTravelerCancel(reservation, now) ? (
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
                    </div>
                  </div>
                </div>
              </article>
              {reservation.status === "PAST" ? (
                <ReservationRating reservation={reservation} onRate={onRate} />
              ) : null}
              </div>
            );
          })}
        </div>
      )}
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
