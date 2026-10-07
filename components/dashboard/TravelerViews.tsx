"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SystemUser } from "@/modules/crm/users/models/User";
import { MyProfilePage } from "@/modules/crm/users/components/MyProfilePage";
import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";
import { tripPath } from "@/modules/landing/lib/travelerRoutes";
import {
  getTravelerPublication,
  listSavedPublications,
  listTravelerPublications,
  rateReservation,
  setPublicationSaved,
} from "@/modules/traveler/services/traveler.service";
import {
  listReservations,
  type Reservation,
  type ReservationStatus,
} from "@/modules/transport/reservations/services/reservation.service";

function TripHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <div className="trip-page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="detail-title">{title}</h1>
      <p className="detail-intro">{lead}</p>
    </div>
  );
}

export function TravelerExplorePage() {
  const provider = useSearchParams().get("provider");
  const [search, setSearch] = useState("");
  const [publications, setPublications] = useState<TravelerPublication[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loadedProvider, setLoadedProvider] = useState("");
  const [loadError, setLoadError] = useState<{ provider: string; message: string } | null>(null);
  const providerKey = provider ?? "";
  const loading = loadedProvider !== providerKey;
  const error = loadError?.provider === providerKey ? loadError.message : null;

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTravelerPublications(providerKey || undefined), listSavedPublications()])
      .then(([publicationRows, savedRows]) => {
        if (!cancelled) {
          setPublications(publicationRows);
          setSavedIds(savedRows.map((publication) => publication.id));
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
  }, [providerKey]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visiblePublications = publications.filter((publication) =>
    [publication.title, publication.destination, publication.description]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );
  const providerName = publications[0]?.providerName;

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
    <section className="page-shell">
      <TripHeading
        eyebrow="Mi viaje"
        title={providerName ? `Viajes de ${providerName}` : "Explorar"}
        lead="Encuentra experiencias y servicios para armar tu próxima ruta."
      />
      <label className="search-panel" style={{ margin: "1.5rem 0", maxWidth: 640, gridTemplateColumns: "1fr" }}>
        <span className="sr-only">Buscar experiencias</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por experiencia o destino"
        />
      </label>
      {error ? <p className="notice" role="alert">{error}</p> : null}
      <div className="card-grid">
        {loading ? (
          <p className="empty-state">Cargando publicaciones...</p>
        ) : visiblePublications.length > 0 ? (
          visiblePublications.map((publication) => (
            <TravelerTripCard
              key={publication.id}
              publication={publication}
              saved={savedIds.includes(publication.id)}
              onToggleSaved={() => void toggleSaved(publication)}
            />
          ))
        ) : (
          <p className="empty-state">
            {error ? "No se pudieron cargar las publicaciones." : "No encontramos viajes con esa búsqueda."}
          </p>
        )}
      </div>
    </section>
  );
}

export function TravelerSavedPage() {
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
        eyebrow="Mi viaje"
        title="Guardados"
        lead="Ideas de viaje que quieres revisar antes de reservar."
      />
      {error ? <p className="notice" role="alert">{error}</p> : null}
      <div className="card-grid">
        {loading ? <p className="empty-state">Cargando publicaciones guardadas...</p>
          : publications.length > 0
            ? publications.map((publication) => (
              <TravelerTripCard
                key={publication.id}
                publication={publication}
                saved
                onToggleSaved={() => void removeSaved(publication)}
              />
            ))
            : <p className="empty-state">Aún no tienes publicaciones guardadas.</p>}
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

function formatDeparture(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function TravelerReservationsPage() {
  const [reservationView, setReservationView] = useState<"upcoming" | "past">("upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="page-shell trip-page-shell">
      <TripHeading
        eyebrow="Mi viaje"
        title="Mis reservas"
        lead="Revisa tus viajes reservados y la información de cada experiencia."
      />
      {error ? (
        <p className="notice" role="alert">{error}</p>
      ) : null}
      <div className="filter-row" role="tablist" aria-label="Filtrar reservas">
        <button
          type="button"
          role="tab"
          className={reservationView === "upcoming" ? "chip chip-active" : "chip"}
          aria-selected={reservationView === "upcoming"}
          onClick={() => setReservationView("upcoming")}
        >
          Por venir
        </button>
        <button
          type="button"
          role="tab"
          className={reservationView === "past" ? "chip chip-active" : "chip"}
          aria-selected={reservationView === "past"}
          onClick={() => setReservationView("past")}
        >
          Historial
        </button>
      </div>
      <ReservationGroup
        title={reservationView === "upcoming" ? "Reservas por venir" : "Historial de reservas"}
        emptyLabel={
          loading
            ? "Cargando reservas..."
            : error
              ? "El listado no está disponible."
              : reservationView === "upcoming"
                ? "No tienes reservas por venir."
                : "No tienes reservas en el historial."
        }
        reservations={visibleReservations}
        onRate={saveRating}
      />
    </section>
  );
}

function TravelerTripCard({
  publication,
  saved = false,
  onToggleSaved,
}: {
  publication: TravelerPublication;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  return (
    <article className="experience-card">
      <div className="card-image-wrap">
        {publication.mainImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={publication.mainImageUrl} alt={publication.title} />
        ) : (
          <p className="empty-state">Sin imagen</p>
        )}
        {onToggleSaved ? (
          <button
            type="button"
            className="save-button"
            aria-pressed={saved}
            aria-label={saved ? `Quitar ${publication.title} de Guardados` : `Guardar ${publication.title}`}
            onClick={onToggleSaved}
          >
            {saved ? "Guardado ♥" : "Guardar ♡"}
          </button>
        ) : null}
      </div>
      <div className="card-body">
        <p className="card-place">{publication.destination}</p>
        <h3>{publication.title}</h3>
        <p>{publication.description}</p>
        <div className="card-footer">
          <strong>${publication.pricePerPerson} <span>· {publication.durationMinutes} min</span></strong>
          <div className="trip-actions">
            <Link className="button button-small" href={tripPath("detalle", { publicacion: publication.id })}>Ver</Link>
            <Link className="button button-primary" href={tripPath("compra", { publicacion: publication.id })}>Reservar</Link>
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
}: {
  title: string;
  emptyLabel: string;
  reservations: Reservation[];
  onRate: (reservationId: string, rating: number) => Promise<void>;
}) {
  const headingId = title.replaceAll(" ", "-").toLowerCase();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="subheading">{title}</h2>
      {reservations.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : reservations.map((reservation) => {
        const people = reservation.numberOfPeople === 1
          ? "1 persona"
          : `${reservation.numberOfPeople} personas`;
        const place = reservation.destination ?? "Sin destino";
        return (
          <article className="reservation-card" key={reservation.id}>
            <div>
              <p>{formatDeparture(reservation.departureStartAt)}</p>
              <h3>{reservation.publicationTitle}</h3>
              <p>{people} · {place}</p>
            </div>
            <div className="trip-actions">
              <span className="badge" style={{ position: "static" }}>{STATUS_LABEL[reservation.status]}</span>
              {reservation.publicationId ? (
                <Link className="button button-outline" href={tripPath("detalle", { publicacion: reservation.publicationId })}>
                  Ver detalles
                </Link>
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
      <span>{reservation.rating ? "Tu calificación" : "Califica este viaje"}</span>
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
            {reservation.rating !== null && rating <= reservation.rating ? "★" : "☆"}
          </button>
        ))}
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

function useTravelerPublication(publicationId: string) {
  const [publication, setPublication] = useState<TravelerPublication | null>(null);
  const [loadedPublicationId, setLoadedPublicationId] = useState("");
  const [loadError, setLoadError] = useState<{ id: string; message: string } | null>(null);
  const loading = loadedPublicationId !== publicationId;
  const error = loadError?.id === publicationId ? loadError.message : null;

  useEffect(() => {
    let cancelled = false;
    getTravelerPublication(publicationId)
      .then((data) => {
        if (!cancelled) {
          setPublication(data);
          setLoadError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError({
            id: publicationId,
            message: cause instanceof Error ? cause.message : "No se pudo cargar esta publicación.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedPublicationId(publicationId);
      });
    return () => {
      cancelled = true;
    };
  }, [publicationId]);

  return { publication, loading, error };
}

export function TravelerDetailsPage({ publicationId }: { publicationId: string }) {
  const { publication, loading, error } = useTravelerPublication(publicationId);

  if (loading) return <p className="trip-status">Cargando publicación...</p>;
  if (error || !publication) return <p className="trip-status" role="alert">{error ?? "La publicación no está disponible."}</p>;

  return (
    <section className="page-shell">
      <Link className="back-link" href={tripPath("explorar")}>← Explorar</Link>
      {publication.providerName && publication.providerSlug ? (
        <Link className="text-link" href={tripPath("explorar", { provider: publication.providerSlug })}>{publication.providerName}</Link>
      ) : null}
      <h1 className="detail-title">{publication.title}</h1>
      <p className="detail-intro">Información completa de esta experiencia.</p>
      <div className="detail-image">
        {publication.mainImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={publication.mainImageUrl} alt={publication.title} />
        ) : (
          <p className="empty-state">Sin imagen</p>
        )}
      </div>
      <p className="card-place">{publication.destination}</p>
      <h2 className="subheading">Conoce la experiencia</h2>
      <p>{publication.description}</p>
      <div className="facts">
        <div><span>Duración</span><strong>{publication.durationMinutes} min</strong></div>
        <div><span>Idiomas</span><strong>{publication.languages.join(", ")}</strong></div>
        <div><span>Precio</span><strong>${publication.pricePerPerson}</strong></div>
        <div><span>Grupo máx.</span><strong>{publication.defaultCapacity}</strong></div>
      </div>
      <div className="detail-grid">
        <div>
          <h2 className="subheading">Qué incluye</h2>
          <p>{publication.included}</p>
        </div>
        <div>
          <h2 className="subheading">Qué no incluye</h2>
          <p>{publication.notIncluded}</p>
        </div>
      </div>
      <h2 className="subheading">Punto de encuentro</h2>
      <p>{publication.meetingPoint}</p>
      <p>Proveedor verificado</p>
    </section>
  );
}

export function TravelerPurchasePage({ publicationId }: { publicationId: string }) {
  const { publication, loading, error } = useTravelerPublication(publicationId);
  const [people, setPeople] = useState("2");
  const total = (publication?.pricePerPerson ?? 0) * Number(people);

  if (loading) return <p className="trip-status">Cargando publicación...</p>;
  if (error || !publication) return <p className="trip-status" role="alert">{error ?? "La publicación no está disponible."}</p>;

  return (
    <section className="page-shell">
      <Link className="back-link" href={tripPath("explorar")}>← Explorar</Link>
      <p className="eyebrow detail-eyebrow">Reservar</p>
      {publication.providerName && publication.providerSlug ? (
        <Link className="text-link" href={tripPath("explorar", { provider: publication.providerSlug })}>{publication.providerName}</Link>
      ) : null}
      <h1 className="detail-title">{publication.title}</h1>
      <p className="detail-intro">Revisa todos los detalles antes de confirmar tu viaje.</p>
      <div className="detail-grid">
        <article>
          <div className="detail-image">
            {publication.mainImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={publication.mainImageUrl} alt={publication.title} />
            ) : (
              <p className="empty-state">Sin imagen</p>
            )}
          </div>
          <p className="card-place">{publication.destination}</p>
          <h2 className="subheading">Conoce la experiencia</h2>
          <p>{publication.description}</p>
          <div className="facts">
            <div><span>Duración</span><strong>{publication.durationMinutes} min</strong></div>
            <div><span>Idiomas</span><strong>{publication.languages.join(", ")}</strong></div>
            <div><span>Precio</span><strong>${publication.pricePerPerson}</strong></div>
            <div><span>Grupo máx.</span><strong>{publication.defaultCapacity}</strong></div>
          </div>
          <h2 className="subheading">Qué incluye</h2>
          <p>{publication.included}</p>
          <h2 className="subheading">Qué no incluye</h2>
          <p>{publication.notIncluded}</p>
          <h2 className="subheading">Punto de encuentro</h2>
          <p>{publication.meetingPoint}</p>
        </article>
        <aside className="booking-card">
          <h2 className="subheading">Resumen de compra</h2>
          <label>
            <span>Fecha</span>
            <input type="date" defaultValue="2026-08-22" />
          </label>
          <label>
            <span>Personas</span>
            <select value={people} onChange={(event) => setPeople(event.target.value)}>
              <option value="1">1 persona</option>
              <option value="2">2 personas</option>
              <option value="3">3 personas</option>
              <option value="4">4 personas</option>
            </select>
          </label>
          <div className="total-row">
            <span>{people} {Number(people) === 1 ? "persona" : "personas"}</span>
            <strong>${total}</strong>
          </div>
          <div className="total-row">
            <span>Total estimado</span>
            <strong>${total}</strong>
          </div>
          <button className="button button-primary button-full" type="button">Confirmar reserva</button>
          <p className="fine-print">Wireframe: no se realiza ningún cobro.</p>
        </aside>
      </div>
    </section>
  );
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
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="page-shell">
      <TripHeading
        eyebrow="Mi viaje"
        title="Mi usuario"
        lead="Aquí puedes revisar y actualizar tus datos personales."
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
        <h2 className="subheading">Mis datos</h2>
        <p>Esta información se usará para tus reservas y comunicaciones.</p>
        <label>
          <span>Nombre completo</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>Correo electrónico</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>Teléfono</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+506 0000-0000" />
        </label>
        <div className="form-actions">
          {saved ? <p role="status">Tus datos fueron actualizados.</p> : null}
          <Link className="button button-outline" href="/forgot-password">Cambiar contraseña</Link>
          <button className="button button-primary" type="submit">Guardar cambios</button>
          <button className="button button-outline" type="button" onClick={() => setDeleteOpen(true)}>Eliminar cuenta</button>
        </div>
      </form>
      <p className="notice">Tus datos están protegidos y solo se comparten cuando los necesitas para una reserva.</p>
      {deleteOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title">¿Seguro que quieres eliminar tu cuenta?</h2>
            <p>Esta acción eliminará tu perfil y no podrás usarlo para tus reservas.</p>
            <div className="form-actions">
              <button className="button button-outline" type="button" onClick={() => setDeleteOpen(false)}>Cancelar</button>
              <button className="button button-primary" type="button" onClick={onDelete}>Sí, eliminar cuenta</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
