"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  ImageIcon,
  MapPin,
  RefreshCw,
  Users,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useAdminPublication,
} from "../../hooks/admin/useAdminPublication";

import type {
  AdminPublicationStatus,
} from "../../services/admin/admin-publication.service";

interface AdminPublicationDetailProps {
  publicationId: string;
}

export default function AdminPublicationDetail({
  publicationId,
}: AdminPublicationDetailProps) {
  const { t, language } = usePreferences();
  const {
    publication,
    loading,
    reviewing,
    error,
    loadPublication,
    approve,
    reject,
  } =
    useAdminPublication(
      publicationId,
    );

  if (loading) {
    return (
      <LoadingState />
    );
  }

  if (
    !publication
  ) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <BackButton />

        <div className="rounded-xl border border-[#DDE2DF] bg-white px-6 py-10 text-center">
          <ImageIcon
            size={25}
            className="mx-auto text-[#87908C]"
          />

          <p className="mt-3 text-[12px] font-semibold text-[#252B28]">{t("No se pudo cargar la publicación ")}</p>

          {error && (
            <p className="mt-2 text-[10px] text-red-600">
              {t(error)}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              void loadPublication()
            }
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D7E1DC] px-3 text-[10px] font-semibold text-[#075E36]"
          >
            <RefreshCw
              size={12}
            />{t("Reintentar ")}</button>
        </div>
      </div>
    );
  }

  const canReview =
    publication.status ===
    "PENDING";

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <BackButton />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-medium text-[#075E36]">{t("Dashboard / Publicaciones / Detalle ")}</p>

          <h1 className="!m-0 !text-[28px] !font-bold !leading-9 !tracking-[-0.025em] text-[#123A30]">{t("Revisión de publicación ")}</h1>

          <p className="mt-1 text-[11px] leading-5 text-[#66706B]">{t("Revisa la información enviada por la agencia antes de aprobar o rechazar la publicación. ")}</p>
        </div>

        <StatusBadge
          status={
            publication.status
          }
        />
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">
          {t(error)}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
        <div className="relative h-[240px] bg-[#EEF4EF]">
          {publication.mainImageUrl ? (
            <img
              src={
                publication.mainImageUrl
              }
              alt={
                publication.title ??
                "Imagen de publicación"
              }
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#91A69A]">
              <ImageIcon
                size={38}
              />
            </div>
          )}

          <div className="absolute left-4 top-4">
            <StatusBadge
              status={
                publication.status
              }
            />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#075E36]">
                {serviceTypeLabel(
                  publication.serviceType,
                )}
              </p>

              <h2 className="mt-1 text-[20px] font-bold text-[#123A30]">
                {publication.title ||
                  "Sin título"}
              </h2>

              {publication.description && (
                <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#66706B]">
                  {
                    publication.description
                  }
                </p>
              )}
            </div>

            <div className="rounded-lg bg-[#F5F8F6] px-4 py-3 text-right">
              <p className="text-[9px] text-[#7A837F]">{t("Precio por persona ")}</p>

              <p className="mt-0.5 text-[18px] font-bold text-[#123A30]">
                {publication.pricePerPerson !==
                null
                  ? `$${publication.pricePerPerson.toFixed(
                      2,
                    )}`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-4">
            <div className="flex items-center gap-3">
              {publication.agency?.logoUrl ? (
                <img
                  src={
                    publication.agency.logoUrl
                  }
                  alt=""
                  className="size-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#EAF5ED] text-[#075E36]">
                  <Building2
                    size={17}
                  />
                </div>
              )}

              <div>
                <p className="text-[9px] text-[#7A837F]">{t("Agencia responsable ")}</p>

                <p className="text-[11px] font-semibold text-[#252B28]">
                  {publication.agency?.commercialName ??
                    publication.agency?.agencyName ??
                    "Sin agencia"}
                </p>

                <p className="mt-0.5 text-[9px] text-[#66706B]">{t("Estado de agencia:")}{t(" ")}
                  {agencyStatusLabel(
                    publication.agency?.status,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={
                <MapPin
                  size={15}
                />
              }
              label="Destino"
              value={
                publication.destination
              }
            />

            <InfoCard
              icon={
                <Clock3
                  size={15}
                />
              }
              label="Duración"
              value={
                publication.durationMinutes !==
                null
                  ? `${publication.durationMinutes} min`
                  : null
              }
            />

            <InfoCard
              icon={
                <Users
                  size={15}
                />
              }
              label="Capacidad"
              value={
                publication.defaultCapacity !==
                null
                  ? `${publication.defaultCapacity} personas`
                  : null
              }
            />

            <InfoCard
              icon={
                <CalendarDays
                  size={15}
                />
              }
              label="Registro"
              value={formatDate(
                publication.createdAt, language,
              )}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <TextSection
              title={t("Qué incluye")}
              value={
                publication.included
              }
            />

            <TextSection
              title={t("Qué no incluye")}
              value={
                publication.notIncluded
              }
            />
          </div>

          <div className="mt-3">
            <TextSection
              title={t("Punto de encuentro")}
              value={
                publication.meetingPoint
              }
            />
          </div>

          <div className="mt-5 rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-4">
            <p className="text-[11px] font-semibold text-[#252B28]">{t("Idiomas ")}</p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {publication.languages.length >
              0 ? (
                publication.languages.map(
                  (
                    language,
                  ) => (
                    <span
                      key={
                        language.id
                      }
                      className="rounded-md bg-[#EAF5ED] px-2 py-1 text-[9px] font-medium text-[#075E36]"
                    >
                      {
                        language.name
                      }
                    </span>
                  ),
                )
              ) : (
                <span className="text-[9px] text-[#87908C]">{t("Sin idiomas registrados ")}</span>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-4">
            <p className="text-[11px] font-semibold text-[#252B28]">{t("Salidas programadas ")}</p>

            {publication.departures.length >
            0 ? (
              <div className="mt-3 space-y-2">
                {publication.departures.map(
                  (
                    departure,
                  ) => (
                    <div
                      key={
                        departure.id
                      }
                      className="flex flex-col gap-2 rounded-lg border border-[#E8ECEA] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-[10px] font-medium text-[#252B28]">
                          {formatDateTime(
                            departure.startAt, language,
                          )}
                        </p>

                        {departure.endAt && (
                          <p className="mt-0.5 text-[9px] text-[#7A837F]">{t("Finaliza:")}{t(" ")}
                            {formatDateTime(
                              departure.endAt, language,
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[9px] text-[#66706B]">
                        <span>{t("Capacidad:")}{t(" ")}
                          {
                            departure.capacity
                          }
                        </span>

                        <span className="rounded-full bg-[#EEF4EF] px-2 py-1 font-medium text-[#075E36]">
                          {departureStatusLabel(
                            departure.status,
                          )}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-2 text-[9px] text-[#87908C]">{t("No hay salidas programadas. ")}</p>
            )}
          </div>
        </div>
      </section>

      {canReview && (
        <section className="mt-4 rounded-xl border border-[#DDE2DF] bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#252B28]">{t("Decisión de revisión ")}</p>

              <p className="mt-1 text-[10px] leading-4 text-[#66706B]">{t("Verifica que la información sea correcta antes de aprobar o rechazar la publicación. ")}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  reviewing
                }
                onClick={() => {
                  const confirmed =
                    window.confirm(
                      `¿Deseas rechazar la publicación "${publication.title ?? "Sin título"}"?`,
                    );

                  if (
                    confirmed
                  ) {
                    void reject();
                  }
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E7BDBD] bg-white px-4 text-[10px] font-semibold text-[#A63737] transition hover:bg-[#FFF2F2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X
                  size={13}
                />{t("Rechazar ")}</button>

              <button
                type="button"
                disabled={
                  reviewing
                }
                onClick={() => {
                  const confirmed =
                    window.confirm(
                      `¿Deseas aprobar la publicación "${publication.title ?? "Sin título"}"?`,
                    );

                  if (
                    confirmed
                  ) {
                    void approve();
                  }
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#075E36] px-4 text-[10px] font-semibold text-white transition hover:bg-[#064D2D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check
                  size={13}
                />

                {t(reviewing
                  ? "Procesando..."
                  : "Aprobar")}
              </button>
            </div>
          </div>
        </section>
      )}

      {publication.status ===
        "APPROVED" && (
        <ResultMessage
          type="approved"
          text="Esta publicación ya fue aprobada."
        />
      )}

      {publication.status ===
        "REJECTED" && (
        <ResultMessage
          type="rejected"
          text="Esta publicación fue rechazada. La agencia puede corregirla y volver a enviarla a revisión."
        />
      )}
    </div>
  );
}

function BackButton() {
  const { t } = usePreferences();
  const router =
    useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        router.push(
          "/dashboard/publications",
        )
      }
      className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#075E36] hover:underline"
    >
      <ArrowLeft
        size={13}
      />{t("Volver a publicaciones ")}</button>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value:
    | string
    | null;
}) {
  const { t } = usePreferences();
  return (
    <div className="rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-3.5">
      <div className="flex items-center gap-2 text-[#075E36]">
        {icon}

        <p className="text-[9px] font-medium text-[#7A837F]">
          {t(label)}
        </p>
      </div>

      <p className="mt-2 text-[11px] font-semibold text-[#252B28]">
        {value ||
          "Sin información"}
      </p>
    </div>
  );
}

function TextSection({
  title,
  value,
}: {
  title: string;
  value:
    | string
    | null;
}) {
  const { t } = usePreferences();
  return (
    <div className="rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-4">
      <p className="text-[11px] font-semibold text-[#252B28]">
        {t(title)}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-[#66706B]">
        {value ||
          "Sin información"}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AdminPublicationStatus;
}) {
  const { t } = usePreferences();
  const config: Record<
    AdminPublicationStatus,
    {
      label: string;
      className: string;
    }
  > = {
    DRAFT: {
      label:
        "Borrador",

      className:
        "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",
    },

    PENDING: {
      label:
        "En revisión",

      className:
        "border-[#F1D49A] bg-[#FFF8E8] text-[#886617]",
    },

    APPROVED: {
      label:
        "Aprobada",

      className:
        "border-[#CBE5D4] bg-[#EAF6EE] text-[#075E36]",
    },

    REJECTED: {
      label:
        "Rechazada",

      className:
        "border-[#F2CACA] bg-[#FFF0F0] text-[#A63737]",
    },

    INACTIVE: {
      label:
        "Inactiva",

      className:
        "border-[#DDE2DF] bg-[#F1F2F1] text-[#727A76]",
    },
  };

  const current =
    config[
      status
    ];

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[9px] font-semibold ${current.className}`}
    >
      {
        t(current.label)
      }
    </span>
  );
}

function serviceTypeLabel(
  value:
    | "EXCURSION"
    | "TRANSPORT"
    | null,
) {
  switch (value) {
    case "EXCURSION":
      return "Excursión";

    case "TRANSPORT":
      return "Transporte";

    default:
      return "Servicio";
  }
}

function agencyStatusLabel(
  value:
    | string
    | undefined,
) {
  switch (value) {
    case "APPROVED":
      return "Aprobada";

    case "PENDING":
      return "En revisión";

    case "REJECTED":
      return "Rechazada";

    case "DRAFT":
      return "Borrador";

    case "INACTIVE":
      return "Inactiva";

    default:
      return "Sin información";
  }
}

function departureStatusLabel(
  value:
    | "ACTIVE"
    | "CANCELLED"
    | "COMPLETED",
) {
  switch (value) {
    case "ACTIVE":
      return "Activa";

    case "CANCELLED":
      return "Cancelada";

    case "COMPLETED":
      return "Completada";

    default:
      return value;
  }
}

function formatDate(
  value: string, language: string = "es",
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language === "en" ? "en-US" : "es-CR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function formatDateTime(
  value: string, language: string = "es",
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language === "en" ? "en-US" : "es-CR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function ResultMessage({
  type,
  text,
}: {
  type:
    | "approved"
    | "rejected";

  text: string;
}) {
  return (
    <div
      className={[
        "mt-4 rounded-lg border px-4 py-3 text-[10px]",

        type ===
        "approved"
          ? "border-[#CBE5D4] bg-[#F1FAF4] text-[#075E36]"
          : "border-[#F2CACA] bg-[#FFF4F4] text-[#A63737]",
      ].join(
        " ",
      )}
    >
      {text}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-4 h-3 w-32 animate-pulse rounded bg-[#E7ECE9]" />

      <div className="mb-4">
        <div className="h-7 w-64 animate-pulse rounded bg-[#E3E8E5]" />

        <div className="mt-2 h-3 w-96 max-w-full animate-pulse rounded bg-[#EEF1EF]" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
        <div className="h-[240px] animate-pulse bg-[#EEF4EF]" />

        <div className="space-y-4 p-6">
          <div className="h-16 w-80 max-w-full animate-pulse rounded bg-[#EEF1EF]" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({
              length: 4,
            }).map(
              (
                _,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="h-24 animate-pulse rounded-lg bg-[#F3F5F4]"
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}