"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { RecordTablePagination, usePagedRows } from "@/components/ui/table-pagination";
import { dateFormatter, durationLabel } from "@/lib/preferences/format";
import { usePreferences } from "@/lib/preferences/Preferences";
import { PublicationStatusBadge } from "@/modules/publications/components/PublicationStatusBadge";
import { usePublications } from "@/modules/publications/hooks/usePublications";
import { isPromotionActive } from "@/lib/promotions/window";
import { AdminPromotionsPage } from "./AdminPromotionsPage";

export function AgencyPromotionsPage() {
  const { role } = useDashboardRole();
  if (role === "Admin") return <AdminPromotionsPage />;
  if (role !== "Agencia") {
    return (
      <DashboardSectionPage
        title="Promociones"
        description="Consulta y gestiona servicios destacados."
      />
    );
  }
  return <AgencyPromotionList />;
}

function AgencyPromotionList() {
  const { t, language } = usePreferences();
  const { publications, loading, error } = usePublications();
  const paged = usePagedRows(publications);
  const formatDate = dateFormatter(language);
  const now = Date.now();

  return (
    <div className="mx-auto min-w-0 w-full max-w-7xl space-y-4">
      <PageHeading
        eyebrow={<DashboardBreadcrumb className="mb-2" items={[{ label: "Promociones" }]} />}
        title={t("Promociones")}
        description={t("Destaca una publicación durante 7 días. El impulso cubre todas sus fechas de salida.")}
      />
      {loading ? <p className="text-sm text-muted-foreground">{t("Cargando publicaciones...")}</p> : null}
      {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
      {!loading && !error && publications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No hay publicaciones para promocionar.")}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {paged.pageRows.map((publication) => {
          const activeUntil = publication.promotedUntil && isPromotionActive(publication.promotedUntil, now)
            ? publication.promotedUntil
            : null;
          const canPay = publication.status === "APPROVED" && !activeUntil;
          return (
            <article
              key={publication.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-42 shrink-0 bg-muted">
                {publication.mainImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={publication.mainImageUrl}
                    alt={publication.title ?? t("Publicación")}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">{t("Sin imagen")}</div>
                )}
                <div className="absolute left-3 top-3">
                  <PublicationStatusBadge status={publication.status} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3 xl:p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1">
                  <div className="contents">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--primary)]">
                      {t(publication.serviceType === "TRANSPORT" ? "Transporte" : "Excursión")}
                    </p>
                    <h2 className="order-3 col-span-2 min-w-0 !m-0 line-clamp-2 !text-base !font-semibold !leading-6 !tracking-normal text-[var(--ink)]">
                      {publication.title ?? t("Publicación sin título")}
                    </h2>
                  </div>
                  <span className="order-2 text-right text-sm font-semibold text-[var(--ink)]">
                    {publication.pricePerPerson !== null ? `USD ${publication.pricePerPerson.toFixed(2)}` : t("Sin precio")}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {publication.description ?? t("Sin descripción disponible.")}
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 rounded-xl bg-muted/30 px-3 py-1 text-xs">
                  <div className="col-span-2 min-w-0">
                    <p className="text-muted-foreground">{t("Destino")}</p>
                    <p className="mt-0.5 truncate font-medium">{publication.destination ?? t("Sin definir")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("Duración")}</p>
                    <p className="mt-0.5 font-medium">
                      {publication.durationMinutes ? durationLabel(publication.durationMinutes) : t("Sin definir")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("Capacidad")}</p>
                    <p className="mt-0.5 font-medium">
                      {publication.defaultCapacity ? `${publication.defaultCapacity} ${t("personas")}` : t("Sin definir")}
                    </p>
                  </div>
                </div>
                {activeUntil ? (
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {t("Promocionada hasta")} {formatDate(activeUntil)}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center justify-end gap-1 border-t pt-2 xl:gap-2">
                  {canPay ? (
                    <Button variant="outline" size="sm" asChild className="gap-1.5">
                      <Link href={`/dashboard/promotions/${publication.id}/pay`}>
                        <Megaphone size={14} aria-hidden="true" />
                        {t("Promocionar")}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1.5" disabled>
                      <Megaphone size={14} aria-hidden="true" />
                      {t("Promocionar")}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!loading && !error && paged.totalPages > 1 ? (
        <div className="mx-auto w-full max-w-sm">
          <RecordTablePagination page={paged.page} totalPages={paged.totalPages} onPageChange={paged.setPage} />
        </div>
      ) : null}
    </div>
  );
}
