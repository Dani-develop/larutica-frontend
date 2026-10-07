"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";

import {
  Eye,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { usePublications } from "../hooks/usePublications";

import { PublicationStatusBadge } from "./PublicationStatusBadge";

export function PublicationsList() {
  const { t } = usePreferences();
  const {
    publications,
    loading,
    error,
    remove,
  } = usePublications();

  async function handleDelete(
    id: string,
    title: string | null,
  ) {
    const confirmed =
      window.confirm(
        `¿Desactivar "${title ?? "esta publicación"}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await remove(id);
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo desactivar la publicación.",
      );
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6">
          <div className="h-7 w-44 animate-pulse rounded bg-muted" />

          <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
              >
                <div className="h-40 animate-pulse bg-muted" />

                <div className="space-y-3 p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />

                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />

                  <div className="h-4 w-full animate-pulse rounded bg-muted" />

                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-medium text-[#0d684e]">{t("Dashboard / Publicaciones ")}</p>

          <h1 className="!m-0 !text-[26px] !font-semibold !leading-tight !tracking-tight text-[#123a30]">{t("Publicaciones ")}</h1>

          <p className="mt-2 text-sm text-muted-foreground">{t("Administra las experiencias y servicios publicados por tu agencia. ")}</p>
        </div>

        <Button
          asChild
          className="gap-2 self-start bg-[#0d684e] text-white hover:bg-[#0b5943] sm:self-auto"
        >
          <Link href="/dashboard/publications/new">
            <Plus size={16} />{t("Nueva publicación ")}</Link>
        </Button>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t(error)}
        </div>
      ) : null}

      {/* Vacío */}
      {publications.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <div className="max-w-md text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#edf7f3] text-[#0d684e]">
              <Plus size={24} />
            </div>

            <h2 className="!mb-0 !mt-4 !text-base !font-semibold !leading-6 !tracking-normal text-[#123a30]">{t("Aún no tienes publicaciones ")}</h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Crea tu primera publicación para empezar a ofrecer experiencias o servicios dentro de LaRutica. ")}</p>

            <Button
              asChild
              className="mt-5 bg-[#0d684e] text-white hover:bg-[#0b5943]"
            >
              <Link href="/dashboard/publications/new">
                <Plus size={16} />{t("Crear publicación ")}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {publications.map(
            (publication) => (
              <article
                key={publication.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Imagen */}
                <div className="relative h-44 bg-muted">
                  {publication.mainImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={publication.mainImageUrl}
                      alt={
                        publication.title ??
                        "Publicación"
                      }
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">{t("Sin imagen ")}</div>
                  )}

                  <div className="absolute left-3 top-3">
                    <PublicationStatusBadge
                      status={publication.status}
                    />
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#0d684e]">
                        {t(publication.serviceType ===
                        "TRANSPORT"
                          ? "Transporte"
                          : "Excursión")}
                      </p>

                      <Link
                        href={`/dashboard/publications/${publication.id}`}
                        className="mt-1 block"
                      >
                        <h2 className="!m-0 line-clamp-2 !text-base !font-semibold !leading-6 !tracking-normal text-[#123a30] hover:underline">
                          {publication.title ??
                            "Publicación sin título"}
                        </h2>
                      </Link>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-[#123a30]">
                      {publication.pricePerPerson !==
                      null
                        ? `$${publication.pricePerPerson.toFixed(
                            2,
                          )}`
                        : "Sin precio"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {publication.description ??
                      "Sin descripción disponible."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-xs sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">{t("Destino ")}</p>

                      <p className="mt-0.5 truncate font-medium">
                        {publication.destination ??
                          "Sin definir"}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">{t("Duración ")}</p>

                      <p className="mt-0.5 font-medium">
                        {publication.durationMinutes
                          ? `${publication.durationMinutes} min`
                          : "Sin definir"}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">{t("Capacidad ")}</p>

                      <p className="mt-0.5 font-medium">
                        {publication.defaultCapacity
                          ? `${publication.defaultCapacity} personas`
                          : "Sin definir"}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-1.5"
                    >
                      <Link
                        href={`/dashboard/publications/${publication.id}`}
                      >
                        <Eye size={14} />{t("Ver ")}</Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-1.5"
                    >
                      <Link
                        href={`/dashboard/publications/${publication.id}/edit`}
                      >
                        <Pencil size={14} />{t("Editar ")}</Link>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={
                        publication.status ===
                        "INACTIVE"
                      }
                      onClick={() =>
                        void handleDelete(
                          publication.id,
                          publication.title,
                        )
                      }
                    >
                      <Trash2 size={14} />

                      {t(publication.status ===
                      "INACTIVE"
                        ? "Inactiva"
                        : "Desactivar")}
                    </Button>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}