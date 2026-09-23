"use client";

import { useRouter } from "next/navigation";

import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { useAgency } from "@/modules/agency/hooks/useAgency";

export default function MyAgencyPage() {
  const router = useRouter();

  const {
    agency,
    loading,
    error,
  } = useAgency();

  if (loading) {
    return <AgencyLoadingState />;
  }

  if (!agency) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <PageHeader
          title="Mi agencia"
          description="Administra la información y el estado de tu agencia dentro de LaRutica."
        />

        {/* ESTADO VACÍO PRINCIPAL */}
        <section className="rounded-xl border border-[#DDE2DF] bg-white px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-[680px] text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#EAF5ED] text-[#075E36]">
              <Building2
                size={22}
                strokeWidth={1.8}
              />
            </div>

            <h2 className="!m-0 !mt-4 !text-[21px] !font-semibold !leading-7 !tracking-[-0.015em] text-[#123A30]">
              Registra tu agencia en LaRutica
            </h2>

            <p className="mx-auto mt-2 max-w-[560px] text-[12px] leading-5 text-[#66706B]">
              Crea el perfil de tu negocio para comenzar el proceso de revisión
              y preparar tu cuenta para publicar experiencias, gestionar
              promociones y recibir reservas.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/my-agency/new")
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#075E36] px-5 text-[12px] font-semibold text-white transition hover:bg-[#064D2D] focus:outline-none focus:ring-2 focus:ring-[#075E36]/20"
              >
                <Plus size={15} />
                Registrar mi agencia
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] leading-4 text-[#7A837F]">
              <ShieldCheck
                size={12}
                className="shrink-0 text-[#6B8176]"
              />

              <span>
                Tu agencia será revisada por administración antes de activarse.
              </span>
            </div>
          </div>

          {/* PASOS */}
          <div className="mx-auto mt-8 grid max-w-[860px] gap-3 border-t border-[#EDF0EE] pt-5 md:grid-cols-3">
            <ProcessStep
              number="1"
              icon={<FileText size={15} />}
              title="Completa tu perfil"
              text="Agrega información del negocio, medios de contacto e identidad visual."
            />

            <ProcessStep
              number="2"
              icon={<ShieldCheck size={15} />}
              title="Envía a revisión"
              text="Administración revisará la información y documentos enviados."
            />

            <ProcessStep
              number="3"
              icon={<BadgeCheck size={15} />}
              title="Activa tu agencia"
              text="Cuando sea aprobada podrás empezar a operar dentro de LaRutica."
            />
          </div>
        </section>

        {/* ALERTA TÉCNICA */}
        {error && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[#F1E5C9] bg-[#FFFCF5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#765B17]">
                El servicio de agencias no está disponible temporalmente
              </p>

              <p className="mt-0.5 text-[10px] leading-4 text-[#8C7743]">
                Puedes continuar revisando la interfaz mientras se completa la
                conexión con el servicio.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-[#D9C993] bg-white px-3 text-[10px] font-semibold text-[#765B17] transition hover:bg-[#FFF9EA]"
            >
              <RefreshCw size={12} />
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <PageHeader
        title="Mi agencia"
        description="Consulta y administra la información de tu agencia."
        action={
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/my-agency/edit")
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#0A6A42] bg-white px-4 text-[11px] font-semibold text-[#075E36] transition hover:bg-[#EFF8F3]"
          >
            <Pencil size={13} />
            Editar agencia
          </button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
        <div className="relative h-[190px] bg-[#EEF4EF]">
          {agency.coverUrl ? (
            <img
              src={agency.coverUrl}
              alt="Portada de la agencia"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#91A69A]">
              <Building2
                size={34}
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>

        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-[#EAF5ED] text-[#075E36] shadow-sm">
                {agency.logoUrl ? (
                  <img
                    src={agency.logoUrl}
                    alt="Logo de la agencia"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={27} />
                )}
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="!m-0 truncate !text-[18px] !font-semibold !leading-6 !tracking-normal text-[#123A30]">
                    {agency.commercialName}
                  </h2>

                  {agency.status === "APPROVED" && (
                    <BadgeCheck
                      size={16}
                      className="shrink-0 text-[#075E36]"
                    />
                  )}
                </div>

                <p className="mt-0.5 truncate text-[11px] text-[#66706B]">
                  {agency.agencyName}
                </p>
              </div>
            </div>

            <AgencyStatusBadge
              status={agency.status}
            />
          </div>

          {agency.description && (
            <p className="mt-5 max-w-3xl text-[11px] leading-5 text-[#66706B]">
              {agency.description}
            </p>
          )}

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <InfoCard
              title="Contacto"
              items={[
                agency.email
                  ? {
                      icon: <Mail size={13} />,
                      text: agency.email,
                    }
                  : null,

                agency.phone
                  ? {
                      icon: <Phone size={13} />,
                      text: agency.phone,
                    }
                  : null,
              ]}
            />

            <InfoCard
              title="Ubicación"
              items={[
                {
                  icon: <MapPin size={13} />,
                  text: [
                    agency.city,
                    agency.province,
                    agency.country,
                  ]
                    .filter(Boolean)
                    .join(", "),
                },

                agency.exactAddress
                  ? {
                      icon: <MapPin size={13} />,
                      text: agency.exactAddress,
                    }
                  : null,
              ]}
            />

            <div className="rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-3.5">
              <p className="text-[11px] font-semibold text-[#252B28]">
                Estado del perfil
              </p>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-[#EAF5ED] text-[#075E36]">
                  <ShieldCheck size={14} />
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#252B28]">
                    {getStatusTitle(agency.status)}
                  </p>

                  <p className="mt-0.5 text-[9px] text-[#66706B]">
                    {getStatusDescription(
                      agency.status,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-[#EDF0EE] pt-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold text-[#252B28]">
                Categorías
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {agency.categories.length > 0 ? (
                  agency.categories.map(
                    (category) => (
                      <span
                        key={category.id}
                        className="rounded-md border border-[#D7E7D9] bg-[#EFF8F3] px-2 py-1 text-[9px] font-medium text-[#075E36]"
                      >
                        {category.name}
                      </span>
                    ),
                  )
                ) : (
                  <EmptyInlineText />
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[#252B28]">
                Idiomas
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {agency.languages.length > 0 ? (
                  agency.languages.map(
                    (language) => (
                      <span
                        key={language.id}
                        className="rounded-md border border-[#E0E4E1] bg-white px-2 py-1 text-[9px] font-medium text-[#52615B]"
                      >
                        {language.name}
                      </span>
                    ),
                  )
                ) : (
                  <EmptyInlineText />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AgencyLoadingState() {
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-4">
        <div className="h-3 w-32 animate-pulse rounded bg-[#E8ECEA]" />

        <div className="mt-3 h-9 w-44 animate-pulse rounded-lg bg-[#E2E8E4]" />

        <div className="mt-2 h-3 w-80 max-w-full animate-pulse rounded bg-[#EEF1EF]" />
      </div>

      <section className="rounded-xl border border-[#DDE2DF] bg-white px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-[680px] text-center">
          <div className="mx-auto size-12 animate-pulse rounded-xl bg-[#EAF5ED]" />

          <div className="mx-auto mt-4 h-6 w-64 animate-pulse rounded bg-[#E4E9E6]" />

          <div className="mx-auto mt-3 h-3 w-full max-w-[520px] animate-pulse rounded bg-[#EEF1EF]" />

          <div className="mx-auto mt-2 h-3 w-4/5 max-w-[420px] animate-pulse rounded bg-[#EEF1EF]" />

          <div className="mx-auto mt-5 h-10 w-44 animate-pulse rounded-lg bg-[#DCE9E1]" />
        </div>

        <div className="mx-auto mt-8 grid max-w-[860px] gap-3 border-t border-[#EDF0EE] pt-5 md:grid-cols-3">
          <LoadingStep />
          <LoadingStep />
          <LoadingStep />
        </div>
      </section>
    </div>
  );
}

function LoadingStep() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#EDF0EE] p-3">
      <div className="size-8 shrink-0 animate-pulse rounded-lg bg-[#EAF5ED]" />

      <div className="flex-1">
        <div className="h-3 w-24 animate-pulse rounded bg-[#E4E9E6]" />

        <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-[#EEF1EF]" />

        <div className="mt-1.5 h-2.5 w-4/5 animate-pulse rounded bg-[#EEF1EF]" />
      </div>
    </div>
  );
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-[10px] font-medium text-[#075E36]">
          Dashboard / Mi agencia
        </p>

        <h1 className="!m-0 !max-w-none !text-[28px] !font-bold !leading-9 !tracking-[-0.025em] text-[#123A30]">
          {title}
        </h1>

        <p className="mt-1 text-[11px] leading-5 text-[#66706B]">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

function ProcessStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-[#E5E9E7] bg-[#FCFDFC] p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF5ED] text-[#075E36]">
          {icon}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold text-[#8A938E]">
            {number}.
          </span>

          <p className="text-[11px] font-semibold text-[#252B28]">
            {title}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[9px] leading-4 text-[#7A837F]">
        {text}
      </p>
    </div>
  );
}

interface InfoItem {
  icon: React.ReactNode;
  text: string;
}

function InfoCard({
  title,
  items,
}: {
  title: string;
  items: Array<InfoItem | null>;
}) {
  const validItems = items.filter(
    (item): item is InfoItem =>
      item !== null && Boolean(item.text),
  );

  return (
    <div className="rounded-lg border border-[#E3E7E5] bg-[#FBFCFB] p-3.5">
      <p className="text-[11px] font-semibold text-[#252B28]">
        {title}
      </p>

      <div className="mt-2.5 space-y-2">
        {validItems.length > 0 ? (
          validItems.map((item, index) => (
            <div
              key={`${item.text}-${index}`}
              className="flex items-start gap-2 text-[10px] leading-4 text-[#66706B]"
            >
              <span className="mt-0.5 shrink-0 text-[#075E36]">
                {item.icon}
              </span>

              <span className="break-words">
                {item.text}
              </span>
            </div>
          ))
        ) : (
          <EmptyInlineText />
        )}
      </div>
    </div>
  );
}

function EmptyInlineText() {
  return (
    <span className="text-[9px] text-[#87908C]">
      Sin información
    </span>
  );
}

function AgencyStatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    DRAFT:
      "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",

    PENDING:
      "border-[#F1D49A] bg-[#FFF8E8] text-[#886617]",

    APPROVED:
      "border-[#CBE5D4] bg-[#EAF6EE] text-[#075E36]",

    REJECTED:
      "border-[#F2CACA] bg-[#FFF0F0] text-[#A63737]",

    INACTIVE:
      "border-[#DDE2DF] bg-[#F1F2F1] text-[#727A76]",
  };

  const labels: Record<string, string> = {
    DRAFT: "Borrador",
    PENDING: "En revisión",
    APPROVED: "Verificada",
    REJECTED: "Rechazada",
    INACTIVE: "Inactiva",
  };

  return (
    <span
      className={[
        "inline-flex h-7 items-center rounded-full border px-2.5 text-[9px] font-semibold",
        styles[status] ??
          "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",
      ].join(" ")}
    >
      {labels[status] ?? status}
    </span>
  );
}

function getStatusTitle(
  status: string,
) {
  switch (status) {
    case "APPROVED":
      return "Agencia verificada";

    case "PENDING":
      return "Revisión en proceso";

    case "REJECTED":
      return "Requiere correcciones";

    case "INACTIVE":
      return "Agencia inactiva";

    default:
      return "Perfil en borrador";
  }
}

function getStatusDescription(
  status: string,
) {
  switch (status) {
    case "APPROVED":
      return "Tu perfil está activo.";

    case "PENDING":
      return "Administración está revisando tu información.";

    case "REJECTED":
      return "Revisa la información antes de reenviar.";

    case "INACTIVE":
      return "Actualmente no está disponible.";

    default:
      return "Completa la información antes de enviarla.";
  }
}