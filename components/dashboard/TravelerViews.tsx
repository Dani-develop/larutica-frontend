"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { Heart } from "lucide-react";
import { CurrencyNotice } from "@/components/preferences/PreferenceControls";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { ExperienceDetail } from "@/modules/booking/ExperienceDetail";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SystemUser } from "@/modules/crm/users/models/User";
import { MyProfilePage } from "@/modules/crm/users/components/MyProfilePage";
import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";
import { tripPath } from "@/modules/landing/lib/travelerRoutes";
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

  const normalizedSearch = (filters?.destination ?? search).trim().toLocaleLowerCase();
  const visiblePublications = publications.filter((publication) =>
    (!providerKey || publication.providerSlug === providerKey)
    && (!filters?.type || publication.serviceType === filters.type)
    && (!filters?.budget || publication.pricePerPerson < 50)
    && (!filters?.date && !filters?.people || publication.departures?.some(d =>
      d.available >= (filters?.people || 1) && (!filters?.date || new Intl.DateTimeFormat('en-CA', {timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d.startAt)) === filters.date)))
    && [publication.title, publication.destination, publication.description]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
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

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Por confirmar",
  CONFIRMED: "Confirmada",
  PAST: "Pasada",
  CANCELLED: "Cancelada",
};

export function TravelerReservationsPage() {
  const { t } = usePreferences();
  const [reservationView, setReservationView] = useState<"upcoming" | "past">("upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

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
      <ReservationGroup
        title={reservationView === "upcoming" ? t("Reservas por venir") : t("Historial de reservas")}
        emptyLabel={
          loading
            ? t("Cargando reservas...")
            : error
              ? t("El listado no está disponible.")
              : reservationView === "upcoming"
                ? t("No tienes reservas por venir.")
                : t("No tienes reservas en el historial.")
        }
        reservations={visibleReservations}
        onRate={saveRating}
        onCancel={cancelReservation}
        cancellingReservationId={cancellingReservationId}
      />
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
