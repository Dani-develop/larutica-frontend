"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, CircleAlert, Clock3, FileText, Plane, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeading, SectionHeading } from "@/components/ui/page-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePreferences } from "@/lib/preferences/Preferences";
import { dateFormatter, localeFor } from "@/lib/preferences/format";
import type { DepartureStatus } from "@/modules/publications/types/publication.types";
import type { ReservationStatus } from "@/modules/transport/reservations/services/reservation.service";
import { useAgencyDashboard } from "../hooks/useAgencyDashboard";
import { ReservationsBarChart } from "./ReservationsBarChart";

type Dashboard = ReturnType<typeof useAgencyDashboard>;
type ResourceState = { loading: boolean; error: boolean };

const reservationLabels: Record<ReservationStatus, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmada", PAST: "Finalizada", CANCELLED: "Cancelada",
};
const departureLabels: Record<DepartureStatus, string> = {
  ACTIVE: "Activa", CANCELLED: "Cancelada", COMPLETED: "Finalizada",
};
const panelClass = "min-w-0 gap-3 py-4 shadow-xs";

function PeriodSelect({ dashboard, id }: { dashboard: Dashboard; id: string }) {
  const { t } = usePreferences();
  return (
    <Select value={dashboard.period} onValueChange={value => dashboard.setPeriod(value === "previous" ? "previous" : "month")}>
      <SelectTrigger id={id} size="sm" aria-label={t("Período de reservas")} className="min-w-40">
        <CalendarDays aria-hidden="true" className="size-4" /><SelectValue />
      </SelectTrigger>
      <SelectContent><SelectItem value="month">{t("Este mes")}</SelectItem><SelectItem value="previous">{t("Mes anterior")}</SelectItem></SelectContent>
    </Select>
  );
}

function LoadError({ retry }: { retry: () => void }) {
  const { t } = usePreferences();
  return <div className="flex flex-wrap items-center gap-3" role="alert">
    <p className="text-sm text-destructive">{t("No se pudieron cargar los datos.")}</p>
    <Button type="button" variant="outline" size="sm" onClick={retry}>{t("Reintentar")}</Button>
  </div>;
}

function TableLoading() {
  const { t } = usePreferences();
  return <div role="status" aria-label={t("Cargando datos…")} className="space-y-3 px-4">
    {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}
  </div>;
}

function MetricValue({ resource, value, retry }: { resource: ResourceState; value: number | undefined; retry: () => void }) {
  const { t, language } = usePreferences();
  if (resource.loading) return <Skeleton aria-label={t("Cargando datos…")} className="h-8 w-20" />;
  if (resource.error || value === undefined) return <LoadError retry={retry} />;
  return <p className="text-2xl font-semibold tabular-nums">{new Intl.NumberFormat(localeFor(language)).format(value)}</p>;
}

export function AgencyDashboard() {
  const { t, language } = usePreferences();
  const dashboard = useAgencyDashboard();
  const number = new Intl.NumberFormat(localeFor(language));
  const formatDate = dateFormatter(language);
  const dateTime = (value: string) => {
    if (!value || Number.isNaN(Date.parse(value))) return <span>{t("Sin información")}</span>;
    return <time dateTime={value}>{formatDate(value).split(/,\s*(?=\d{1,2}:)/u).map((part, index) => <span key={index} className="block whitespace-nowrap">{part}</span>)}</time>;
  };
  const metrics = [
    { title: "Reservas del mes", value: dashboard.monthReservations, resource: dashboard.reservations, icon: CalendarDays, note: "Creadas en el período seleccionado" },
    { title: "Publicaciones activas", value: dashboard.activePublications, resource: dashboard.publications, icon: FileText, note: "Publicaciones aprobadas" },
    { title: "Próximas salidas", value: dashboard.upcomingCount, resource: dashboard.departures, icon: Plane, note: "Salidas activas por realizar" },
    { title: "Viajeros reservados", value: dashboard.reservedTravelers, resource: dashboard.reservations, icon: Users, note: "Plazas del período, sin canceladas" },
  ];
  const attention = [
    { title: "Publicaciones en revisión", count: dashboard.pendingPublications, note: "Están siendo evaluadas por el administrador.", icon: Clock3 },
    { title: "Publicaciones rechazadas", count: dashboard.rejectedPublications, note: "Requieren correcciones para poder publicarse.", icon: CircleAlert },
  ];
  const departuresLoading = dashboard.departures.loading || dashboard.reservations.loading;
  const departuresError = dashboard.departures.error || dashboard.reservations.error;

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-4 [&_.lr-page-title]:text-[length:var(--type-section)]! [&_.lr-section-title]:text-[length:var(--type-card)]! [&_.lr-section-heading]:mb-0! [&_.lr-section-description]:mt-1! [&_.lr-section-description]:text-sm!">
      <PageHeading title={t("Panel de Control")} description={t("Consulta la actividad de tu agencia, próximas salidas y reservas recientes.")} actions={<PeriodSelect dashboard={dashboard} id="agency-dashboard-period" />} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ title, value, resource, icon: Icon, note }) => <Card key={title} className="gap-0 py-4 shadow-xs">
          <CardContent className="flex items-start gap-3 px-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-5" /></span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-medium">{t(title)}</h2>
              <MetricValue resource={resource} value={value} retry={dashboard.reload} />
              {!resource.loading && !resource.error && <p className="text-xs text-muted-foreground">{t(note)}</p>}
            </div>
          </CardContent>
        </Card>)}
      </div>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-5">
        <Card className="min-w-0 gap-3 py-4 shadow-xs xl:col-span-3">
          <CardHeader>
            <SectionHeading title={t("Reservas recibidas")} description={t("Reservas realizadas para las experiencias de tu agencia durante el período seleccionado.")} />
          </CardHeader>
          <CardContent>
            {dashboard.reservations.loading ? <Skeleton aria-label={t("Cargando datos…")} className="h-48 w-full" /> : dashboard.reservations.error ? <LoadError retry={dashboard.reload} /> : <ReservationsBarChart bars={dashboard.bars} />}
          </CardContent>
        </Card>
        <Card className="min-w-0 gap-3 py-4 shadow-xs xl:col-span-2">
          <CardHeader><SectionHeading title={t("Necesitan tu atención")} description={t("Revisa los elementos que requieren tu seguimiento.")} /></CardHeader>
          <CardContent className="divide-y">
            {dashboard.publications.loading ? <div role="status" aria-label={t("Cargando datos…")} className="space-y-3"><Skeleton className="h-6 w-9" /><Skeleton className="h-6 w-9" /></div> : dashboard.publications.error ? <LoadError retry={dashboard.reload} /> : attention.map(({ title, count, note, icon: Icon }) => <div key={title} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><Icon aria-hidden="true" className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(title)}</p>
                <p className="text-xs text-muted-foreground">{t(count === 0 ? "No hay publicaciones en este estado." : note)}</p>
              </div>
              <Badge variant="secondary">{number.format(count ?? 0)}</Badge>
              <Button variant="ghost" size="icon" asChild><Link href="/dashboard/publications" aria-label={t(title)}><ChevronRight aria-hidden="true" className="size-4" /></Link></Button>
            </div>)}
          </CardContent>
        </Card>
      </div>

      <Card className={panelClass}>
        <CardHeader><SectionHeading title={t("Próximas salidas")} description={t("Tus próximas salidas activas y el estado de sus reservaciones.")} actions={<Button asChild variant="outline" size="sm"><Link href="/dashboard/publications">{t("Ver publicaciones")}<ChevronRight aria-hidden="true" className="size-4" /></Link></Button>} /></CardHeader>
        <CardContent>
          {departuresError ? <div className="px-4"><LoadError retry={dashboard.reload} /></div> : departuresLoading ? <TableLoading /> : <Table className="w-full table-fixed max-md:min-w-[44rem] [&_th]:whitespace-normal! [&_td]:whitespace-normal! [&_td]:py-3!">
            <TableCaption className="sr-only">{t("Próximas salidas")}</TableCaption>
            <colgroup><col className="w-[28%]" /><col className="w-[19%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[20%]" /><col className="w-[11%]" /></colgroup>
            <TableHeader className="bg-muted/50"><TableRow>{["Experiencia", "Fecha y hora", "Reservados", "Capacidad", "Ocupación", "Estado"].map(title => <TableHead key={title} scope="col">{t(title)}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{dashboard.upcoming.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10! text-center text-muted-foreground">{t("No hay próximas salidas programadas.")}</TableCell></TableRow> : dashboard.upcoming.map(departure => {
              const percentage = departure.capacity > 0 ? departure.occupied / departure.capacity * 100 : null;
              const bounded = percentage === null ? 0 : Math.min(100, Math.max(0, percentage));
              return <TableRow key={departure.id}>
                <TableCell><div className="flex min-w-0 items-center gap-3">
                  {departure.publication.mainImageUrl && <img src={departure.publication.mainImageUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/publications/${departure.publicationId}`} title={departure.publication.title || t("Sin título")} className="block truncate rounded font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">{departure.publication.title || t("Sin título")}</Link>
                    {departure.publication.serviceType && <p className="mt-0.5 truncate text-xs text-muted-foreground">{t(departure.publication.serviceType === "EXCURSION" ? "Excursión" : "Transporte")}</p>}
                  </div>
                </div></TableCell>
                <TableCell>{dateTime(departure.startAt)}</TableCell>
                <TableCell className="tabular-nums">{number.format(departure.occupied)}</TableCell>
                <TableCell className="tabular-nums">{number.format(departure.capacity)}</TableCell>
                <TableCell>{percentage === null ? <p className="text-xs text-muted-foreground">{t("Capacidad no disponible")}</p> : <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm tabular-nums"><span className="text-xs text-muted-foreground">{number.format(Math.round(percentage))}%</span></div>
                  <div role="progressbar" aria-label={t("Ocupación")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded} aria-valuetext={`${number.format(departure.occupied)}/${number.format(departure.capacity)}`} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${bounded}%` }} /></div>
                </div>}</TableCell>
                <TableCell><Badge variant="default" className="max-w-full whitespace-normal text-left">{t(departureLabels[departure.status])}</Badge></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Card className={panelClass}>
        <CardHeader><SectionHeading title={t("Reservas recientes")} description={t("Últimas reservas realizadas en las experiencias de tu agencia.")} actions={<Button asChild variant="outline" size="sm"><Link href="/dashboard/reservations">{t("Ver todas las reservas")}<ChevronRight aria-hidden="true" className="size-4" /></Link></Button>} /></CardHeader>
        <CardContent>
          {dashboard.reservations.loading ? <TableLoading /> : dashboard.reservations.error ? <div className="px-4"><LoadError retry={dashboard.reload} /></div> : <Table className="w-full table-fixed max-xl:min-w-[56rem] [&_th]:px-2! [&_td]:px-2! [&_td]:py-3! [&_th]:whitespace-normal! [&_td]:whitespace-normal! [&_th:nth-child(1)]:whitespace-nowrap! [&_td:nth-child(1)]:whitespace-nowrap! [&_th:nth-child(5)]:whitespace-nowrap! [&_td:nth-child(5)]:whitespace-nowrap! [&_th:nth-child(5)]:text-center [&_td:nth-child(5)]:text-center">
            <TableCaption className="sr-only">{t("Reservas recientes")}</TableCaption>
            <colgroup><col className="w-[13%]" /><col className="w-[26%]" /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[9%]" /><col className="w-[16%]" /></colgroup>
            <TableHeader className="bg-muted/50"><TableRow>{["Reserva", "Experiencia", "Fecha de reserva", "Fecha de salida", "Personas", "Estado"].map(title => <TableHead scope="col" key={title}>{t(title)}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{dashboard.recent.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10! text-center text-muted-foreground">{t("No hay reservas registradas.")}</TableCell></TableRow> : dashboard.recent.map(reservation => <TableRow key={reservation.id}>
              <TableCell><Link href={`/dashboard/reservations#reserva-${reservation.id}`} title={reservation.id} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring">{reservation.id.slice(0, 8).toUpperCase()}<span className="sr-only"> · {reservation.id}</span></Link></TableCell>
              <TableCell><span className="block whitespace-normal" title={reservation.publicationTitle}>{reservation.publicationTitle}</span></TableCell>
              <TableCell>{dateTime(reservation.createdAt)}</TableCell>
              <TableCell>{dateTime(reservation.departureStartAt)}</TableCell>
              <TableCell className="tabular-nums">{number.format(reservation.numberOfPeople)}</TableCell>
              <TableCell><Badge variant={reservation.status === "CANCELLED" ? "destructive" : reservation.status === "CONFIRMED" ? "default" : "secondary"} className="max-w-full whitespace-normal text-left">{t(reservationLabels[reservation.status])}</Badge></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
}
