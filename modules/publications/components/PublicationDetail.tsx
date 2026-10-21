"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Languages,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { usePublications } from "../hooks/usePublications";

import type {
  Publication,
} from "../types/publication.types";

import { PublicationStatusBadge } from "./PublicationStatusBadge";

export function PublicationDetail({
  id,
}: {
  id: string;
}) {
  const { t } = usePreferences();
  const router =
    useRouter();

  const {
    getById,
    remove,
  } =
    usePublications();

  const [
    publication,
    setPublication,
  ] =
    useState<Publication | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadPublication() {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getById(id);

        if (active) {
          setPublication(
            result,
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "No se pudo cargar la publicación.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPublication();

    return () => {
      active = false;
    };
  }, [
    getById,
    id,
  ]);

  async function handleDelete() {
    if (!publication) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Desactivar "${publication.title ?? "esta publicación"}"?`,
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await remove(
        publication.id,
      );

      router.push(
        "/dashboard/publications",
      );
    } catch (deleteError) {
      window.alert(
        deleteError instanceof
          Error
          ? deleteError.message
          : "No se pudo desactivar la publicación.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="space-y-4">
          <div className="h-7 w-52 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (
    error ||
    !publication
  ) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="!m-0 text-red-800 lr-page-title">{t("No se pudo cargar la publicación ")}</h1>

          <p className="mt-2 text-sm text-red-700">
            {error ??
              "La publicación no existe."}
          </p>

          <Button
            variant="outline"
            asChild
            className="mt-4"
          >
            <Link href="/dashboard/publications">{t("Volver al listado ")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Volver */}
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 h-8 gap-1.5 px-2 text-xs text-muted-foreground"
        >
          <Link href="/dashboard/publications">
            <ArrowLeft
              size={15}
            />{t("Volver a publicaciones ")}</Link>
        </Button>
      </div>

      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <DashboardBreadcrumb className="mb-2" items={[{ label: "Publicaciones", href: "/dashboard/publications" }, { label: "Detalle" }]} />

          <h1 className="!m-0 lr-page-title">
            {publication.title ??
              "Publicación sin título"}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PublicationStatusBadge
              status={
                publication.status
              }
            />

            <span className="text-xs text-muted-foreground">
              {t(publication.serviceType ===
              "TRANSPORT"
                ? "Transporte"
                : "Excursión")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <Link
              href={`/dashboard/publications/${publication.id}/edit`}
            >
              <Pencil
                size={14}
              />{t("Editar ")}</Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              deleting ||
              publication.status ===
                "INACTIVE"
            }
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() =>
              void handleDelete()
            }
          >
            <Trash2
              size={14}
            />

            {t(publication.status ===
            "INACTIVE"
              ? "Inactiva"
              : deleting
                ? "Desactivando..."
                : "Desactivar")}
          </Button>
        </div>
      </div>

      {/* Imagen */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-muted shadow-sm">
        {publication.mainImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={
              publication.mainImageUrl
            }
            alt={
              publication.title ??
              "Publicación"
            }
            className="h-72 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t("Sin imagen principal ")}</div>
        )}
      </div>

      {/* Descripción */}
      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">{t("Descripción ")}</h2>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {publication.description ??
            "Sin descripción."}
        </p>
      </section>

      {/* Información principal */}
      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">{t("Información del servicio ")}</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            icon={
              <MapPin
                size={16}
              />
            }
            label="Destino"
            value={
              publication.destination ??
              "Sin definir"
            }
          />

          <InfoItem
            icon={
              <Clock3
                size={16}
              />
            }
            label="Duración"
            value={
              publication.durationMinutes
                ? `${publication.durationMinutes} minutos`
                : "Sin definir"
            }
          />

          <InfoItem
            icon={
              <Users
                size={16}
              />
            }
            label="Capacidad"
            value={
              publication.defaultCapacity
                ? `${publication.defaultCapacity} personas`
                : "Sin definir"
            }
          />

          <InfoItem
            icon={
              <CalendarDays
                size={16}
              />
            }
            label="Precio"
            value={
              publication.pricePerPerson !==
              null
                ? `$${publication.pricePerPerson.toFixed(
                    2,
                  )} USD`
                : "Sin definir"
            }
          />
        </div>
      </section>

      {/* Idiomas */}
      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Languages
            size={16}
            className="text-[var(--primary)]"
          />

          <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">{t("Idiomas ")}</h2>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {publication.languages &&
          publication.languages.length >
            0 ? (
            publication.languages.map(
              (language) => (
                <span
                  key={
                    language.id
                  }
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
                >
                  {language.name}
                </span>
              ),
            )
          ) : (
            <p className="text-sm text-muted-foreground">{t("Sin idiomas definidos. ")}</p>
          )}
        </div>
      </section>

      {/* Incluye / no incluye */}
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">{t("Qué incluye ")}</h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {publication.included ??
              "Sin información."}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">{t("Qué no incluye ")}</h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {publication.notIncluded ??
              "Sin información."}
          </p>
        </div>
      </section>

      {/* Punto de encuentro */}
      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin
            size={16}
            className="text-[var(--primary)]"
          />

          <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">{t("Punto de encuentro ")}</h2>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {publication.meetingPoint ??
            "Sin definir."}
        </p>
      </section>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { t } = usePreferences();
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-[var(--primary)]">
        {icon}

        <span className="text-[11px] font-medium uppercase tracking-wide">
          {t(label)}
        </span>
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}