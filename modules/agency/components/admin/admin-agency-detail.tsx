"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  ExternalLink,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useAdminAgency,
} from "../../hooks/admin/useAdminAgency";

import type {
  Agency,
  AgencyStatus,
} from "../../types/agency.types";

interface AdminAgencyDetailProps {
  agencyId: string;
}

export default function AdminAgencyDetail({
  agencyId,
}: AdminAgencyDetailProps) {
  const {
    agency,
    loading,
    reviewing,
    openingDocument,
    error,
    loadAgency,
    approve,
    reject,
    openDocument,
  } = useAdminAgency(
    agencyId,
  );

  if (loading) {
    return <LoadingState />;
  }

  if (!agency) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <BackButton />

        <div className="rounded-xl border border-[#DDE2DF] bg-white px-6 py-10 text-center">
          <Building2
            size={24}
            className="mx-auto text-[#87908C]"
          />

          <p className="mt-3 text-[12px] font-semibold text-[#252B28]">
            No se pudo cargar la agencia
          </p>

          {error && (
            <p className="mt-2 text-[10px] text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              void loadAgency()
            }
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D7E1DC] px-3 text-[10px] font-semibold text-[#075E36]"
          >
            <RefreshCw
              size={12}
            />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const canReview =
    agency.status ===
    "PENDING";

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <BackButton />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-medium text-[#075E36]">
            Dashboard / Agencias / Detalle
          </p>

          <h1 className="!m-0 !text-[28px] !font-bold !leading-9 !tracking-[-0.025em] text-[#123A30]">
            Revisión de agencia
          </h1>

          <p className="mt-1 text-[11px] leading-5 text-[#66706B]">
            Revisa la información y el documento enviado antes de tomar una decisión.
          </p>
        </div>

        <StatusBadge
          status={
            agency.status
          }
        />
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
        <div className="relative h-[190px] bg-[#EEF4EF]">
          {agency.coverUrl ? (
            <img
              src={
                agency.coverUrl
              }
              alt="Portada de la agencia"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#91A69A]">
              <Building2
                size={34}
              />
            </div>
          )}
        </div>

        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-8 flex items-end gap-3">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-[#EAF5ED] text-[#075E36] shadow-sm">
              {agency.logoUrl ? (
                <img
                  src={
                    agency.logoUrl
                  }
                  alt="Logo de la agencia"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2
                  size={27}
                />
              )}
            </div>

            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="!m-0 truncate !text-[18px] !font-semibold !leading-6 text-[#123A30]">
                  {
                    agency.commercialName
                  }
                </h2>

                {agency.status ===
                  "APPROVED" && (
                  <BadgeCheck
                    size={16}
                    className="text-[#075E36]"
                  />
                )}
              </div>

              <p className="text-[10px] text-[#66706B]">
                {
                  agency.agencyName
                }
              </p>
            </div>
          </div>

          {agency.description && (
            <p className="mt-5 max-w-4xl text-[11px] leading-5 text-[#66706B]">
              {
                agency.description
              }
            </p>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              title="Contacto"
            >
              <InfoRow
                icon={
                  <Mail size={13} />
                }
                value={
                  agency.email
                }
              />

              <InfoRow
                icon={
                  <Phone size={13} />
                }
                value={
                  agency.phone
                }
              />

              <InfoRow
                icon={
                  <Globe2 size={13} />
                }
                value={
                  agency.website
                }
              />
            </InfoCard>

            <InfoCard
              title="Ubicación"
            >
              <InfoRow
                icon={
                  <MapPin size={13} />
                }
                value={[
                  agency.city,
                  agency.province,
                  agency.country,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    ", ",
                  )}
              />

              <InfoRow
                icon={
                  <MapPin size={13} />
                }
                value={
                  agency.exactAddress
                }
              />
            </InfoCard>

            <InfoCard
              title="Información"
            >
              <InfoRow
                icon={
                  <Building2 size={13} />
                }
                value={businessTypeLabel(
                  agency,
                )}
              />

              <InfoRow
                icon={
                  <ShieldCheck size={13} />
                }
                value={
                  agency.acceptedTerms
                    ? "Términos aceptados"
                    : "Términos no aceptados"
                }
              />

              <InfoRow
                icon={
                  <FileText size={13} />
                }
                value={`Registrada: ${formatDate(
                  agency.createdAt,
                )}`}
              />
            </InfoCard>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <TagSection
              title="Categorías"
              values={agency.categories.map(
                (
                  item,
                ) =>
                  item.name,
              )}
            />

            <TagSection
              title="Idiomas"
              values={agency.languages.map(
                (
                  item,
                ) =>
                  item.name,
              )}
            />
          </div>

          <div className="mt-5 rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText
                    size={15}
                    className="text-[#075E36]"
                  />

                  <p className="text-[11px] font-semibold text-[#252B28]">
                    Documento de verificación
                  </p>
                </div>

                <p className="mt-1 text-[9px] leading-4 text-[#7A837F]">
                  El documento está almacenado de forma privada y el acceso generado es temporal.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  openingDocument ||
                  !agency.verificationDocumentUrl
                }
                onClick={() =>
                  void openDocument()
                }
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#0A6A42] bg-white px-3 text-[10px] font-semibold text-[#075E36] transition hover:bg-[#EFF8F3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink
                  size={12}
                />

                {openingDocument
                  ? "Abriendo..."
                  : "Ver documento"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {canReview && (
        <section className="mt-4 rounded-xl border border-[#DDE2DF] bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#252B28]">
                Decisión de revisión
              </p>

              <p className="mt-1 text-[10px] leading-4 text-[#66706B]">
                Aprueba la agencia si la información y documentación son correctas, o recházala para que pueda corregirse y reenviarse.
              </p>
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
                      `¿Deseas rechazar la agencia "${agency.commercialName}"?`,
                    );

                  if (
                    confirmed
                  ) {
                    void reject();
                  }
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E7BDBD] bg-white px-4 text-[10px] font-semibold text-[#A63737] transition hover:bg-[#FFF2F2] disabled:opacity-50"
              >
                <X
                  size={13}
                />
                Rechazar
              </button>

              <button
                type="button"
                disabled={
                  reviewing
                }
                onClick={() => {
                  const confirmed =
                    window.confirm(
                      `¿Deseas aprobar la agencia "${agency.commercialName}"?`,
                    );

                  if (
                    confirmed
                  ) {
                    void approve();
                  }
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#075E36] px-4 text-[10px] font-semibold text-white transition hover:bg-[#064D2D] disabled:opacity-50"
              >
                <Check
                  size={13}
                />

                {reviewing
                  ? "Procesando..."
                  : "Aprobar"}
              </button>
            </div>
          </div>
        </section>
      )}

      {agency.status ===
        "APPROVED" && (
        <ResultMessage
          type="approved"
          text="Esta agencia ya fue aprobada y puede operar dentro de LaRutica."
        />
      )}

      {agency.status ===
        "REJECTED" && (
        <ResultMessage
          type="rejected"
          text="Esta agencia fue rechazada. El propietario puede corregirla y enviarla nuevamente a revisión."
        />
      )}
    </div>
  );
}

function BackButton() {
  const router =
    useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        router.push(
          "/dashboard/agencies",
        )
      }
      className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#075E36] hover:underline"
    >
      <ArrowLeft
        size={13}
      />
      Volver a agencias
    </button>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-3.5">
      <p className="text-[11px] font-semibold text-[#252B28]">
        {title}
      </p>

      <div className="mt-2.5 space-y-2">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  value,
}: {
  icon:
    React.ReactNode;

  value:
    string | null;
}) {
  return (
    <div className="flex items-start gap-2 text-[10px] leading-4 text-[#66706B]">
      <span className="mt-0.5 shrink-0 text-[#075E36]">
        {icon}
      </span>

      <span>
        {value ||
          "Sin información"}
      </span>
    </div>
  );
}

function TagSection({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <div className="rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-3.5">
      <p className="text-[11px] font-semibold text-[#252B28]">
        {title}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {values.length >
        0 ? (
          values.map(
            (
              value,
            ) => (
              <span
                key={
                  value
                }
                className="rounded-md bg-[#EAF5ED] px-2 py-1 text-[9px] font-medium text-[#075E36]"
              >
                {
                  value
                }
              </span>
            ),
          )
        ) : (
          <span className="text-[9px] text-[#87908C]">
            Sin información
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AgencyStatus;
}) {
  const config: Record<
    AgencyStatus,
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
        current.label
      }
    </span>
  );
}

function businessTypeLabel(
  agency: Agency,
) {
  switch (
    agency.businessType
  ) {
    case "AGENCY":
      return "Agencia";

    case "TOUR_OPERATOR":
      return "Operador turístico";

    case "TRANSPORT":
      return "Transporte";

    case "INDEPENDENT_GUIDE":
      return "Guía independiente";

    default:
      return agency.businessType;
  }
}

function formatDate(
  value: string,
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
    "es-CR",
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

function ResultMessage({
  type,
  text,
}: {
  type:
    | "approved"
    | "rejected";

  text:
    string;
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
      <div className="mb-4 h-3 w-28 animate-pulse rounded bg-[#E7ECE9]" />

      <div className="mb-4">
        <div className="h-7 w-56 animate-pulse rounded bg-[#E3E8E5]" />

        <div className="mt-2 h-3 w-96 max-w-full animate-pulse rounded bg-[#EEF1EF]" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
        <div className="h-[190px] animate-pulse bg-[#EEF4EF]" />

        <div className="space-y-4 p-6">
          <div className="h-16 w-72 max-w-full animate-pulse rounded bg-[#EEF1EF]" />

          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({
              length: 3,
            }).map(
              (
                _,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="h-28 animate-pulse rounded-lg bg-[#F3F5F4]"
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}