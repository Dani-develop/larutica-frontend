"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  ExternalLink,
  FileText,
  Globe2,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminAgency } from "../../hooks/admin/useAdminAgency";
import type { Agency, AgencyStatus, BusinessType } from "../../types/agency.types";

const statusBadgeClass: Record<AgencyStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
};

const statusLabel: Record<AgencyStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  INACTIVE: "Inactiva",
};

function StatusBadge({ status }: { status: AgencyStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 !text-xs !font-medium",
        statusBadgeClass[status],
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

function businessTypeLabel(value: BusinessType) {
  switch (value) {
    case "AGENCY":
      return "Agencia";
    case "TOUR_OPERATOR":
      return "Operador turístico";
    case "TRANSPORT":
      return "Transporte";
    case "INDEPENDENT_GUIDE":
      return "Guía independiente";
    default:
      return value;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground !text-xs !font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="mt-0.5 break-words !text-sm !font-medium">
          {value?.trim() ? value : "—"}
        </p>
      </div>
    </div>
  );
}

function TagList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="!m-0 !text-sm !font-semibold">{title}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={value}
              className="bg-muted text-foreground inline-flex rounded-full px-2.5 py-1 !text-xs !font-medium"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground !text-xs">Sin información</span>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        aria-label="Cerrar imagen"
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[min(96vw,1100px)] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}

export default function AdminAgencyDetail({
  agencyId,
}: {
  agencyId: string;
}) {
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
  } = useAdminAgency(agencyId);
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  if (loading) return <LoadingState />;

  if (!agency) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Breadcrumb>
          <BreadcrumbList className="!text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/dashboard"
                className="flex items-center gap-1.5 !text-sm"
              >
                <Home className="size-3.5" />
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/agencies" className="!text-sm">
                Agencias
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="!text-sm">Detalle</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <Building2 className="text-muted-foreground/40 size-7" />
          </div>
          <p className="!text-sm !font-medium">No se pudo cargar la agencia</p>
          {error ? (
            <p className="text-destructive !text-xs">{error}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="!text-sm"
            onClick={() => void loadAgency()}
          >
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  const canReview = agency.status === "PENDING";
  const location = [agency.city, agency.province, agency.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList className="!text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="flex items-center gap-1.5 !text-sm"
            >
              <Home className="size-3.5" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/agencies" className="!text-sm">
              Agencias
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="!text-sm">
              {agency.commercialName}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="!m-0 !max-w-none !text-2xl !leading-8 !font-semibold !tracking-tight">
            Detalle de agencia
          </h1>
          <p className="text-muted-foreground mt-0.5 !text-sm !leading-5">
            Revisa la información y el documento de verificación.
          </p>
        </div>
      </div>

      {error ? (
        <p
          className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 !text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="bg-card overflow-hidden rounded-xl">
        <div className="bg-muted relative aspect-[21/9] max-h-56 w-full overflow-hidden sm:aspect-[3/1]">
          {agency.coverUrl ? (
            <button
              type="button"
              className="group relative size-full cursor-zoom-in"
              aria-label="Ver portada en grande"
              onClick={() =>
                setLightbox({
                  src: agency.coverUrl!,
                  alt: `Portada de ${agency.commercialName}`,
                })
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agency.coverUrl}
                alt=""
                className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-4 py-3 text-left !text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                Toca para ver en grande
              </span>
            </button>
          ) : (
            <div className="text-muted-foreground/25 flex size-full items-center justify-center">
              <Building2 className="size-10" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
          {agency.logoUrl ? (
            <button
              type="button"
              className="bg-muted ring-background group size-16 shrink-0 cursor-zoom-in overflow-hidden rounded-2xl ring-1 transition hover:ring-primary/30 sm:size-20"
              aria-label="Ver logo en grande"
              onClick={() =>
                setLightbox({
                  src: agency.logoUrl!,
                  alt: `Logo de ${agency.commercialName}`,
                })
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agency.logoUrl}
                alt=""
                className="size-full object-cover transition duration-300 group-hover:scale-105"
              />
            </button>
          ) : (
            <div className="bg-muted ring-background flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 sm:size-20">
              <Building2 className="text-muted-foreground size-7" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="!m-0 !text-lg !leading-7 !font-semibold !tracking-tight">
                    {agency.commercialName}
                  </p>
                  {agency.status === "APPROVED" ? (
                    <BadgeCheck
                      className="text-primary size-5 shrink-0"
                      aria-label="Agencia verificada"
                    />
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-0.5 !text-sm">
                  {agency.agencyName}
                </p>
              </div>
              <StatusBadge status={agency.status} />
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 !text-sm">
              <span>{businessTypeLabel(agency.businessType)}</span>
              {location ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" />
                    {location}
                  </span>
                </>
              ) : null}
            </div>

            {agency.description ? (
              <p className="text-muted-foreground max-w-3xl !text-sm !leading-6">
                {agency.description}
              </p>
            ) : null}

            {agency.status === "APPROVED" ? (
              <p className="text-primary !text-xs !font-medium">
                Agencia aprobada · puede operar dentro de LaRutica
              </p>
            ) : null}

            {agency.status === "REJECTED" ? (
              <p className="text-destructive !text-xs !font-medium">
                Agencia rechazada · el propietario puede corregirla y reenviar
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card rounded-xl p-5">
          <h2 className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal">
            Contacto y ubicación
          </h2>
          <div className="mt-2 divide-y">
            <InfoRow icon={Mail} label="Correo" value={agency.email} />
            <InfoRow icon={Phone} label="Teléfono" value={agency.phone} />
            <InfoRow icon={Globe2} label="Sitio web" value={agency.website} />
            <InfoRow icon={MapPin} label="Ubicación" value={location} />
            <InfoRow
              icon={MapPin}
              label="Dirección exacta"
              value={agency.exactAddress}
            />
          </div>
        </section>

        <section className="bg-card rounded-xl p-5">
          <h2 className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal">
            Información de la cuenta
          </h2>
          <div className="mt-2 divide-y">
            <InfoRow
              icon={Building2}
              label="Tipo de negocio"
              value={businessTypeLabel(agency.businessType)}
            />
            <InfoRow
              icon={ShieldCheck}
              label="Términos"
              value={
                agency.acceptedTerms
                  ? "Términos aceptados"
                  : "Términos no aceptados"
              }
            />
            <InfoRow
              icon={FileText}
              label="Fecha de registro"
              value={formatDate(agency.createdAt)}
            />
          </div>

          <Separator className="my-5" />

          <div className="space-y-5">
            <TagList
              title="Categorías"
              values={agency.categories.map((item) => item.name)}
            />
            <TagList
              title="Idiomas"
              values={agency.languages.map((item) => item.name)}
            />
          </div>
        </section>
      </div>

      <section className="bg-card rounded-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal">
              Documento de verificación
            </h2>
            <p className="text-muted-foreground mt-1 !text-sm">
              El documento está almacenado de forma privada y el acceso generado
              es temporal.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-2 !text-sm"
            disabled={openingDocument || !agency.verificationDocumentUrl}
            onClick={() => void openDocument()}
          >
            <ExternalLink className="size-4" />
            {openingDocument ? "Abriendo…" : "Ver documento"}
          </Button>
        </div>
      </section>

      {canReview ? (
        <section className="bg-card flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal">
              Decisión de revisión
            </h2>
            <p className="text-muted-foreground mt-1 !text-sm">
              Aprueba la agencia si la información y documentación son correctas,
              o recházala para que pueda corregirse.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive gap-2 !text-sm"
              disabled={reviewing}
              onClick={() => {
                if (
                  window.confirm(
                    `¿Deseas rechazar la agencia "${agency.commercialName}"?`,
                  )
                ) {
                  void reject();
                }
              }}
            >
              <X className="size-4" />
              Rechazar
            </Button>
            <Button
              type="button"
              className="gap-2 !text-sm"
              disabled={reviewing}
              onClick={() => {
                if (
                  window.confirm(
                    `¿Deseas aprobar la agencia "${agency.commercialName}"?`,
                  )
                ) {
                  void approve();
                }
              }}
            >
              <Check className="size-4" />
              {reviewing ? "Procesando…" : "Aprobar"}
            </Button>
          </div>
        </section>
      ) : null}

      {lightbox ? (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
