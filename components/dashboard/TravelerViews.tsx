"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  listReservations,
  type Reservation,
  type ReservationStatus,
} from "@/modules/transport/reservations/services/reservation.service";

import type { SystemUser } from "@/modules/crm/users/models/User";
import { MyProfilePage } from "@/modules/crm/users/components/MyProfilePage";

import {
  travelerPublications,
} from "@/modules/traveler/data/traveler-publications";

import type {
  TravelerPublication,
} from "@/modules/traveler/types/traveler-publication.types";


const savedTrips: TravelerPublication[] = [
  travelerPublications[0],
  travelerPublications[1],
  {
    ...travelerPublications[0],

    id: "saved-catamaran-03",

    title:
      "Atardecer en catamarán por Playas del Coco",

    destination:
      "Playas del Coco",

    description:
      "Navegación tranquila, vistas de la costa y refrigerio al caer la tarde.",

    pricePerPerson:
      76,

    durationMinutes:
      300,

    meetingPoint:
      "Playas del Coco",

    defaultCapacity:
      18,
  },
];

const publicationProviders: Record<
  string,
  {
    name: string;
    slug: string;
  }
> = {
  "pub-arenal-01": {
    name: "Arenal Viajes",
    slug: "arenal-viajes",
  },

  "pub-monteverde-02": {
    name: "Monteverde Natural",
    slug: "monteverde-natural",
  },
};

function providerFor(
  publicationId: string,
) {
  return (
    publicationProviders[
      publicationId
    ] ?? {
      name: "Proveedores locales",
      slug: "proveedores-locales",
    }
  );
}

export function TravelerExplorePage() {
  const provider =
    useSearchParams().get(
      "provider",
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const providerPublications =
    provider
      ? travelerPublications.filter(
          (publication) =>
            providerFor(
              publication.id,
            ).slug ===
            provider,
        )
      : travelerPublications;

  const normalizedSearch =
    search
      .trim()
      .toLocaleLowerCase();

  const visiblePublications =
    providerPublications.filter(
      (publication) =>
        [
          publication.title,
          publication.destination,
          publication.description,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(
            normalizedSearch,
          ),
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Mi viaje
        </p>

        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {provider
            ? `Viajes de ${providerFor(provider).name}`
            : "Explorar"}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Encuentra experiencias y servicios para armar tu próxima ruta.
        </p>
      </div>

      <label className="flex max-w-xl items-center gap-3 rounded-lg border bg-background px-3 py-2 shadow-xs focus-within:border-primary">
        <Search
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />

        <span className="sr-only">
          Buscar experiencias
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Buscar por experiencia o destino"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visiblePublications.length >
        0 ? (
          visiblePublications.map(
            (publication) => (
              <TravelerTripCard
                key={
                  publication.id
                }
                publication={
                  publication
                }
              />
            ),
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            No encontramos viajes con esa búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}

export function TravelerSavedPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Mi viaje
        </p>

        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Guardados
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Ideas de viaje que quieres revisar antes de reservar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {savedTrips.map(
          (publication) => (
            <TravelerTripCard
              key={
                publication.id
              }
              publication={
                publication
              }
            />
          ),
        )}
      </div>
    </div>
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Mi viaje
        </p>

        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Mis reservas
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Revisa tus viajes reservados y la información de cada experiencia.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        <div
          className="inline-flex rounded-lg border bg-muted/40 p-1"
          role="tablist"
          aria-label="Filtrar reservas"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              reservationView ===
              "upcoming"
            }
            onClick={() =>
              setReservationView(
                "upcoming",
              )
            }
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              reservationView ===
              "upcoming"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Por venir
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              reservationView ===
              "past"
            }
            onClick={() =>
              setReservationView(
                "past",
              )
            }
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              reservationView ===
              "past"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
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
        />
      </div>
    </div>
  );
}

function ReservationGroup({
  title,
  emptyLabel,
  reservations,
}: {
  title: string;
  emptyLabel: string;
  reservations: Reservation[];
}) {
  const headingId = title.replaceAll(" ", "-").toLowerCase();
  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold">{title}</h2>
      {reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : reservations.map((reservation) => {
        const people = reservation.numberOfPeople === 1
          ? "1 persona"
          : `${reservation.numberOfPeople} personas`;
        const place = reservation.destination ?? "Sin destino";
        return (
          <Card key={reservation.id} className="shadow-xs">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" />
                  <span>{formatDeparture(reservation.departureStartAt)}</span>
                </div>
                <h3 className="font-semibold">{reservation.publicationTitle}</h3>
                <p className="text-sm text-muted-foreground">{people} · {place}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  {STATUS_LABEL[reservation.status]}
                </span>
                {reservation.publicationId ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/publications/${reservation.publicationId}?mode=details`}>Ver detalles</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function TravelerTripCard({
  publication,
}: {
  publication: TravelerPublication;
}) {
  return (
    <Card className="overflow-hidden shadow-xs">
      {publication.mainImageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={
            publication.mainImageUrl
          }
          alt={
            publication.title
          }
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-44 items-center justify-center bg-muted text-sm text-muted-foreground">
          Sin imagen
        </div>
      )}

      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <MapPin className="size-3.5" />

          <span>
            {
              publication.destination
            }
          </span>
        </div>

        <CardTitle className="text-base leading-snug">
          {
            publication.title
          }
        </CardTitle>

        <CardDescription>
          {
            publication.description
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="text-sm">
          <span className="font-semibold">
            $
            {
              publication.pricePerPerson
            }
          </span>

          <span className="text-muted-foreground">
            {" "}
            ·{" "}
            {
              publication.durationMinutes
            }{" "}
            min
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              href={`/dashboard/publications/${publication.id}?mode=details`}
            >
              Ver
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="bg-emerald-700 text-white hover:bg-emerald-800"
          >
            <Link
              href={`/dashboard/publications/${publication.id}?mode=reserve`}
            >
              Reservar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TravelerDetailsPage({
  publicationId,
}: {
  publicationId: string;
}) {
  const publication =
    travelerPublications.find(
      (item) =>
        item.id ===
        publicationId,
    ) ??
    travelerPublications[0];

  const provider =
    providerFor(
      publication.id,
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link
            href="/dashboard/publications"
            className="hover:underline"
          >
            Explorar
          </Link>

          <span className="text-muted-foreground">
            {" "}
            / Ver detalles
          </span>
        </p>

        <Link
          href={`/dashboard/publications?provider=${provider.slug}`}
          className="mt-1 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {provider.name}
        </Link>

        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {
            publication.title
          }
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Información completa de esta experiencia.
        </p>
      </div>

      <Card className="overflow-hidden shadow-xs">
        {publication.mainImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={
              publication.mainImageUrl
            }
            alt={
              publication.title
            }
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 items-center justify-center bg-muted text-sm text-muted-foreground">
            Sin imagen
          </div>
        )}

        <CardHeader>
          <CardDescription className="flex items-center gap-2 uppercase tracking-wide text-primary">
            <MapPin className="size-3.5" />

            {
              publication.destination
            }
          </CardDescription>

          <CardTitle className="text-xl">
            Conoce la experiencia
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-sm">
          <p className="leading-relaxed">
            {
              publication.description
            }
          </p>

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">
                Duración
              </p>

              <p className="font-medium">
                {
                  publication.durationMinutes
                }{" "}
                min
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">
                Idiomas
              </p>

              <p className="font-medium">
                {publication.languages.join(
                  ", ",
                )}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">
                Precio
              </p>

              <p className="font-medium">
                $
                {
                  publication.pricePerPerson
                }
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">
                Grupo máx.
              </p>

              <p className="font-medium">
                {
                  publication.defaultCapacity
                }
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold">
                Qué incluye
              </h2>

              <p className="leading-relaxed text-muted-foreground">
                {
                  publication.included
                }
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold">
                Qué no incluye
              </h2>

              <p className="leading-relaxed text-muted-foreground">
                {
                  publication.notIncluded
                }
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-2 font-semibold">
              Punto de encuentro
            </h2>

            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />

              <span>
                {
                  publication.meetingPoint
                }
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="size-4" />

            Proveedor verificado
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TravelerPurchasePage({
  publicationId,
}: {
  publicationId: string;
}) {
  const publication =
    travelerPublications.find(
      (item) =>
        item.id ===
        publicationId,
    ) ??
    travelerPublications[0];

  const provider =
    providerFor(
      publication.id,
    );

  const [
    people,
    setPeople,
  ] = useState("2");

  const total =
    publication.pricePerPerson *
    Number(people);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link
            href="/dashboard/publications"
            className="hover:underline"
          >
            Explorar
          </Link>

          <span className="text-muted-foreground">
            {" "}
            / Reservar
          </span>
        </p>

        <Link
          href={`/dashboard/publications?provider=${provider.slug}`}
          className="mt-1 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {provider.name}
        </Link>

        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {
            publication.title
          }
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Revisa todos los detalles antes de confirmar tu viaje.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="overflow-hidden shadow-xs">
          {publication.mainImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={
                publication.mainImageUrl
              }
              alt={
                publication.title
              }
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="flex h-64 items-center justify-center bg-muted text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}

          <CardHeader>
            <CardDescription className="flex items-center gap-2 uppercase tracking-wide text-primary">
              <MapPin className="size-3.5" />

              {
                publication.destination
              }
            </CardDescription>

            <CardTitle className="text-xl">
              Conoce la experiencia
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-sm">
            <p className="leading-relaxed">
              {
                publication.description
              }
            </p>

            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">
                  Duración
                </p>

                <p className="font-medium">
                  {
                    publication.durationMinutes
                  }{" "}
                  min
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Idiomas
                </p>

                <p className="font-medium">
                  {publication.languages.join(
                    ", ",
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Precio
                </p>

                <p className="font-medium">
                  $
                  {
                    publication.pricePerPerson
                  }
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Grupo máx.
                </p>

                <p className="font-medium">
                  {
                    publication.defaultCapacity
                  }
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="mb-2 font-semibold">
                  Qué incluye
                </h2>

                <p className="leading-relaxed text-muted-foreground">
                  {
                    publication.included
                  }
                </p>
              </div>

              <div>
                <h2 className="mb-2 font-semibold">
                  Qué no incluye
                </h2>

                <p className="leading-relaxed text-muted-foreground">
                  {
                    publication.notIncluded
                  }
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-2 font-semibold">
                Punto de encuentro
              </h2>

              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" />

                <span>
                  {
                    publication.meetingPoint
                  }
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="size-4" />

              Proveedor verificado
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit shadow-xs">
          <CardHeader>
            <CardTitle>
              Resumen de compra
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <label className="grid gap-1 text-sm font-medium">
              <span>
                Fecha
              </span>

              <input
                className="h-9 rounded-md border bg-background px-3"
                type="date"
                defaultValue="2026-08-22"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              <span>
                Personas
              </span>

              <select
                className="h-9 rounded-md border bg-background px-3"
                value={people}
                onChange={(event) =>
                  setPeople(
                    event.target.value,
                  )
                }
              >
                <option value="1">
                  1 persona
                </option>

                <option value="2">
                  2 personas
                </option>

                <option value="3">
                  3 personas
                </option>

                <option value="4">
                  4 personas
                </option>
              </select>
            </label>

            <div className="flex justify-between text-sm">
              <span>
                {people}{" "}
                {Number(
                  people,
                ) === 1
                  ? "persona"
                  : "personas"}
              </span>

              <strong>
                ${total}
              </strong>
            </div>

            <div className="flex justify-between border-t pt-4">
              <span className="font-medium">
                Total estimado
              </span>

              <strong>
                ${total}
              </strong>
            </div>

            <Button
              className="w-full bg-emerald-700 text-white hover:bg-emerald-800"
              type="button"
            >
              Confirmar reserva
            </Button>

            <p className="text-xs text-muted-foreground">
              Wireframe: no se realiza ningún cobro.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TravelerProfilePage() {
  return (
    <MyProfilePage />
  );
}

export function TravelerProfileForm({
  profile,
  onSave,
  onDelete,
  saved,
}: {
  profile: SystemUser;

  onSave: (
    value: {
      name: string;
      email: string;
      phone: string;
    },
  ) => void;

  onDelete: () => void;

  saved: boolean;
}) {
  const [
    name,
    setName,
  ] =
    useState(
      profile.name,
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      profile.email,
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      profile.phone,
    );

  const [
    deleteOpen,
    setDeleteOpen,
  ] =
    useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Mi viaje
        </p>

        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Mi usuario
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Aquí puedes revisar y actualizar tus datos personales.
        </p>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>
            Mis datos
          </CardTitle>

          <CardDescription>
            Esta información se usará para tus reservas y comunicaciones.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();

              onSave({
                name:
                  name.trim() ||
                  "Usuario sin nombre",

                email:
                  email.trim(),

                phone:
                  phone.trim(),
              });
            }}
          >
            <label className="grid gap-1 text-sm font-medium">
              <span>
                Nombre completo
              </span>

              <input
                className="h-9 rounded-md border bg-background px-3 font-normal"
                value={name}
                onChange={(event) => {
                  setName(
                    event.target
                      .value,
                  );
                }}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              <span>
                Correo electrónico
              </span>

              <input
                className="h-9 rounded-md border bg-background px-3 font-normal"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target
                      .value,
                  );
                }}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              <span>
                Teléfono
              </span>

              <input
                className="h-9 rounded-md border bg-background px-3 font-normal"
                value={phone}
                onChange={(event) => {
                  setPhone(
                    event.target
                      .value,
                  );
                }}
                placeholder="+506 0000-0000"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {saved ? (
                <p
                  className="text-sm text-primary"
                  role="status"
                >
                  Tus datos fueron actualizados.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button
                  asChild
                  type="button"
                  variant="outline"
                >
                  <Link href="/forgot-password">
                    Cambiar contraseña
                  </Link>
                </Button>

                <Button type="submit">
                  Guardar cambios
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    setDeleteOpen(
                      true,
                    )
                  }
                >
                  Eliminar cuenta
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/60 shadow-xs">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-emerald-900">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />

          <p>
            Tus datos están protegidos y solo se comparten cuando los necesitas para una reserva.
          </p>
        </CardContent>
      </Card>

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
        >
          <section
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <h2
              id="delete-account-title"
              className="text-lg font-semibold"
            >
              ¿Seguro que quieres eliminar tu cuenta?
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Esta acción eliminará tu perfil y no podrás usarlo para tus reservas.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDeleteOpen(
                    false,
                  )
                }
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={
                  onDelete
                }
              >
                Sí, eliminar cuenta
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}