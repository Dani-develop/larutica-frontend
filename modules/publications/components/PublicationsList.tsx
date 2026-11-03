"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { useAgency } from "@/modules/agency/hooks/useAgency";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TablePagination, usePagedRows } from "@/components/ui/table-pagination";

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
  const { role } = useDashboardRole();
  return role === "Agencia" ? <AgencyPublicationsList /> : <PublicationsListContent />;
}

function AgencyPublicationsList() {
  const { t } = usePreferences();
  const { agency, loading, error, loadAgency } = useAgency();
  const approved = !loading && !error && agency?.status === "APPROVED";
  const title = agency?.status === "PENDING" ? "Tu agencia está en revisión"
    : agency?.status === "REJECTED" ? "Tu agencia fue rechazada" : "Tu agencia debe estar aprobada";
  const description = agency?.status === "PENDING" ? "Podrás crear publicaciones cuando un administrador apruebe tu agencia."
    : agency?.status === "REJECTED" ? "Corrige la información desde Mi agencia y envíala nuevamente a revisión para poder crear publicaciones."
    : "Para crear publicaciones, primero debes registrar tu agencia y esperar a que sea aprobada por un administrador.";
  const notice = approved ? null : <Card className="mb-5" role="status">
    <CardHeader>
      <CardTitle>{t(loading ? "Consultando tu agencia..." : error ? "No se pudo consultar tu agencia" : title)}</CardTitle>
      {!loading && <CardDescription>{t(error ? "Reintenta la consulta para comprobar si puedes crear publicaciones." : description)}</CardDescription>}
    </CardHeader>
    {!loading && <CardContent className="flex flex-wrap gap-3">
      {error && <Button variant="outline" onClick={() => void loadAgency()}>{t("Reintentar")}</Button>}
      <Button asChild variant="outline"><Link href="/dashboard/my-agency">{t("Ir a Mi agencia")}</Link></Button>
    </CardContent>}
  </Card>;
  return <PublicationsListContent canCreate={approved} notice={notice} agencyView />;
}

function PublicationsListContent({ canCreate = true, notice, agencyView = false }: { canCreate?: boolean; notice?: ReactNode; agencyView?: boolean }) {
  const { t } = usePreferences();
  const {
    publications,
    loading,
    error,
    remove,
  } = usePublications();
  const paged = usePagedRows(publications);
  const visiblePublications = agencyView ? paged.pageRows : publications;

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
      <div className={agencyView ? "@container mx-auto w-full max-w-7xl" : "mx-auto w-full max-w-7xl"}>
        <div className="mb-6">
          <div className="h-7 w-44 animate-pulse rounded bg-muted" />

          <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
        </div>

        <div className={agencyView ? "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" : "grid gap-4 lg:grid-cols-2"}>
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
              >
                <div className={agencyView ? "h-42 animate-pulse bg-muted" : "h-40 animate-pulse bg-muted"} />

                <div className={agencyView ? "space-y-2 p-4" : "space-y-3 p-5"}>
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
    <div className={agencyView ? "@container mx-auto w-full max-w-7xl" : "mx-auto w-full max-w-7xl"}>
      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <DashboardBreadcrumb className="mb-2" items={[{ label: "Publicaciones" }]} />

          <h1 className={agencyView ? "!m-0 lr-page-title text-[length:var(--type-section)]!" : "!m-0 lr-page-title"}>{t("Publicaciones ")}</h1>

          <p className="mt-2 text-sm text-muted-foreground">{t("Administra las experiencias y servicios publicados por tu agencia. ")}</p>
        </div>

        {canCreate && <Button
          asChild
          className="gap-2 self-start bg-[var(--primary)] text-white hover:bg-[var(--brand-forest-hover)] sm:self-auto"
        >
          <Link href="/dashboard/publications/new">
            <Plus size={16} />{t("Nueva publicación ")}</Link>
        </Button>}
      </div>

      {notice}

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
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--primary)]">
              <Plus size={24} />
            </div>

            <h2 className="!mb-0 !mt-4 !text-base !font-semibold !leading-6 !tracking-normal text-[var(--ink)]">{t("Aún no tienes publicaciones ")}</h2>

            {canCreate && <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Crea tu primera publicación para empezar a ofrecer experiencias o servicios dentro de LaRutica. ")}</p>}

            {canCreate && <Button
              asChild
              className="mt-5 bg-[var(--primary)] text-white hover:bg-[var(--brand-forest-hover)]"
            >
              <Link href="/dashboard/publications/new">
                <Plus size={16} />{t("Crear publicación ")}</Link>
            </Button>}
          </div>
        </div>
      ) : (
        <div className={agencyView ? "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" : "grid gap-4 lg:grid-cols-2"}>
          {visiblePublications.map(
            (publication) => (
              <article
                key={publication.id}
                className={agencyView ? "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md" : "overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md"}
              >
                {/* Imagen */}
                <div className={agencyView ? "relative h-42 shrink-0 bg-muted" : "relative h-44 bg-muted"}>
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
                <div className={agencyView ? "flex flex-1 flex-col gap-2 p-3 xl:p-4" : "p-5"}>
                  <div className={agencyView ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1" : "flex items-start justify-between gap-4"}>
                    <div className={agencyView ? "contents" : "min-w-0"}>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--primary)]">
                        {t(publication.serviceType ===
                        "TRANSPORT"
                          ? "Transporte"
                          : "Excursión")}
                      </p>

                      <Link
                        href={`/dashboard/publications/${publication.id}`}
                        className={agencyView ? "order-3 col-span-2 block min-w-0" : "mt-1 block"}
                      >
                        <h2 className="!m-0 line-clamp-2 !text-base !font-semibold !leading-6 !tracking-normal text-[var(--ink)] hover:underline">
                          {publication.title ??
                            "Publicación sin título"}
                        </h2>
                      </Link>
                    </div>

                    <span className={agencyView ? "order-2 text-right text-sm font-semibold text-[var(--ink)]" : "shrink-0 text-sm font-semibold text-[var(--ink)]"}>
                      {publication.pricePerPerson !==
                      null
                        ? `$${publication.pricePerPerson.toFixed(
                            2,
                          )}`
                        : "Sin precio"}
                    </span>
                  </div>

                  <p className={agencyView ? "line-clamp-2 text-sm leading-5 text-muted-foreground" : "mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground"}>
                    {publication.description ??
                      "Sin descripción disponible."}
                  </p>

                  <div className={agencyView ? "grid grid-cols-2 gap-x-2 gap-y-1 rounded-xl bg-muted/30 px-3 py-1 text-xs" : "mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-xs sm:grid-cols-3"}>
                    <div className={agencyView ? "col-span-2 min-w-0" : undefined}>
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
                  <div className={agencyView ? "mt-auto flex flex-wrap items-center justify-end gap-1 border-t pt-2 xl:gap-2" : "mt-4 flex flex-wrap justify-end gap-2 border-t pt-4"}>
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
      {agencyView && paged.totalPages > 1 && <div className="mt-4">
        <TablePagination {...paged} onPageChange={paged.setPage} />
      </div>}
    </div>
  );
}
