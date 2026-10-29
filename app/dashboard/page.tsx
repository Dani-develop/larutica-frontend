"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { dateFormatter, localeFor } from "@/lib/preferences/format";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { PageHeading, SectionHeading } from "@/components/ui/page-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard, type DashboardPeriod } from "@/modules/dashboard/hooks/useAdminDashboard";
import { ReservationsBarChart } from "@/modules/dashboard/components/ReservationsBarChart";
import { AgencyDashboard } from "@/modules/dashboard/components/AgencyDashboard";

import Link from "next/link";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  MapPin,
  Megaphone,
  Users,
  CalendarDays,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const metrics = [
  { label: "Usuarios", value: "286", note: "+24 este mes", href: "/dashboard/users", icon: Users },
  { label: "Agencias", value: "38", note: "32 verificadas", href: "/dashboard/agencies", icon: Building2 },
  { label: "Publicaciones", value: "124", note: "2 por revisar", href: "/dashboard/publications", icon: FileText },
  { label: "Destinos", value: "18", note: "3 provincias nuevas", href: "/dashboard/destinations", icon: MapPin },
];

const quickLinks = [
  {
    href: "/dashboard/users",
    title: "Gestionar usuarios",
    description: "Revisa perfiles, roles y estado.",
    icon: Users,
  },
  {
    href: "/dashboard/agencies",
    title: "Administrar agencias",
    description: "Verificación y datos de contacto.",
    icon: Building2,
  },
  {
    href: "/dashboard/publications",
    title: "Publicaciones",
    description: "Excursiones y servicios de transporte.",
    icon: FileText,
  },
  {
    href: "/dashboard/destinations",
    title: "Destinos",
    description: "Crea y actualiza lugares.",
    icon: MapPin,
  },
  {
    href: "/dashboard/promotions",
    title: "Promociones",
    description: "Servicios destacados en resultados.",
    icon: Megaphone,
  },
  {
    href: "/dashboard/reviews",
    title: "Pendientes",
    description: "Contenido que requiere revisión.",
    icon: ClipboardCheck,
  },
];

export default function Page() {
  const { role } = useDashboardRole();
  return role === "Admin" ? <AdminDashboard /> : role === "Agencia" ? <AgencyDashboard /> : <ExistingDashboard />;
}

function AdminDashboard() {
  const { t, language } = usePreferences();
  const dashboard = useAdminDashboard();
  const formatDate = dateFormatter(language);
  const number = new Intl.NumberFormat(localeFor(language));
  const statusLabels = { CONFIRMED: "Confirmada", CANCELLED: "Cancelada", PAST: "Finalizada", PENDING: "Pendiente de confirmación" };
  const metrics = [
    { title: "Reservas del mes", value: dashboard.monthReservations, resource: dashboard.reservations, icon: CalendarDays, note: "Creadas en el mes actual" },
    { title: "Usuarios registrados", value: dashboard.users.data?.length, resource: dashboard.users, icon: Users, note: "Perfiles registrados" },
    { title: "Agencias registradas", value: dashboard.agencies.data?.length, resource: dashboard.agencies, icon: Building2, note: "Todos los estados" },
    { title: "Publicaciones activas", value: dashboard.activePublications, resource: dashboard.publications, icon: FileText, note: "Publicaciones aprobadas" },
  ];
  const attention = [
    { title: "Agencias por verificar", note: "Agencias pendientes de verificación", count: dashboard.pendingAgencies, resource: dashboard.agencies, icon: Building2, href: "/dashboard/agencies" },
    { title: "Publicaciones por revisar", note: "Publicaciones pendientes de revisión", count: dashboard.pendingPublications, resource: dashboard.publications, icon: FileText, href: "/dashboard/publications" },
  ];
  const loading = metrics.some(metric => metric.resource.loading);

  return <div className="mx-auto min-w-0 max-w-7xl space-y-4 [&_.lr-page-title]:text-[length:var(--type-section)]! [&_.lr-section-title]:text-[length:var(--type-card)]! [&_.lr-section-heading]:mb-0! [&_.lr-section-description]:mt-1! [&_.lr-section-description]:text-sm!">
    <PageHeading title={t("Resumen general")} description={t("Consulta la actividad de LaRutica y lo que necesita tu atención.")} actions={
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="dashboard-period" className="block text-sm text-muted-foreground">{t("Período de la gráfica")}</label>
          <Select value={dashboard.period} onValueChange={value => dashboard.setPeriod(value as DashboardPeriod)}>
            <SelectTrigger id="dashboard-period" size="sm" className="min-w-40"><CalendarDays aria-hidden="true" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="month">{t("Este mes")}</SelectItem><SelectItem value="previous">{t("Mes anterior")}</SelectItem></SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={dashboard.reload}><RefreshCw aria-hidden="true" className="size-4" />{t("Actualizar")}</Button>
      </div>
    } />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ title, value, resource, icon: Icon, note }) => <Card key={title} className="gap-0 py-4 shadow-xs">
        <CardContent className="flex items-start gap-3 px-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 space-y-1"><h2 className="text-sm font-medium">{t(title)}</h2>
            {resource.loading ? <Skeleton aria-label={t("Cargando datos…")} className="h-8 w-20" /> : resource.error ? <p role="alert" className="text-sm text-destructive">{t("No se pudieron cargar los datos.")}</p> : <p className="text-2xl font-semibold tabular-nums">{number.format(value ?? 0)}</p>}
            <p className="text-xs text-muted-foreground">{t(note)}</p>
          </div>
        </CardContent>
      </Card>)}
    </div>

    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-5">
      <Card className="min-w-0 gap-3 py-4 shadow-xs xl:col-span-3">
        <CardHeader><SectionHeading title={t("Reservas registradas")} description={t("Total de reservas por fecha de creación en el período seleccionado.")} /></CardHeader>
        <CardContent>{dashboard.reservations.loading ? <Skeleton aria-label={t("Cargando datos…")} className="h-48 w-full" /> : dashboard.reservations.error ? <p role="alert" className="text-sm text-destructive">{t("No se pudieron cargar las reservas.")}</p> : <ReservationsBarChart bars={dashboard.bars} />}</CardContent>
      </Card>
      <Card className="min-w-0 gap-3 py-4 shadow-xs xl:col-span-2">
        <CardHeader><SectionHeading title={t("Necesitan tu atención")} description={t("Elementos que requieren revisión administrativa.")} /></CardHeader>
        <CardContent className="divide-y">
          {attention.map(({ title, note, count, resource, icon: Icon, href }) => <div key={title} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><Icon aria-hidden="true" className="size-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{t(title)}</p><p className="text-xs text-muted-foreground">{t(note)}</p>
              {resource.error && <p role="alert" className="text-sm text-destructive">{t("No se pudieron cargar los datos.")}</p>}
              {!resource.loading && !resource.error && count === 0 && <p className="text-xs text-muted-foreground">{t("No hay elementos pendientes.")}</p>}
            </div>
            {resource.loading ? <Skeleton aria-label={t("Cargando datos…")} className="h-6 w-9" /> : !resource.error && <Badge variant="secondary">{number.format(count ?? 0)}</Badge>}
            <Button variant="ghost" size="icon" asChild><Link href={href} aria-label={t(title)}><ChevronRight aria-hidden="true" className="size-4" /></Link></Button>
          </div>)}
        </CardContent>
      </Card>
    </div>

    <Card className="min-w-0 gap-3 py-4 shadow-xs">
      <CardHeader><SectionHeading title={t("Próximas salidas")} description={t("Experiencias programadas por las agencias.")} /></CardHeader>
      <CardContent>
        {dashboard.upcomingDepartures.loading ? <div aria-label={t("Cargando datos…")} className="space-y-3">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div> : dashboard.upcomingDepartures.error ? <p role="alert" className="text-sm text-destructive">{t("No se pudieron cargar las salidas.")}</p> : <Table className="w-full table-fixed max-md:min-w-[44rem] [&_th]:whitespace-normal! [&_td]:whitespace-normal! [&_td]:py-3!">
          <TableCaption className="sr-only">{t("Próximas salidas")}</TableCaption>
          <colgroup><col className="w-[30%]" /><col className="w-[22%]" /><col className="w-[23%]" /><col className="w-[25%]" /></colgroup>
          <TableHeader className="bg-muted/50"><TableRow>{["Experiencia", "Agencia", "Fecha y hora", "Cupos"].map(title => <TableHead key={title} scope="col">{t(title)}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{!dashboard.upcomingDepartures.data?.length ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("No hay próximas salidas programadas.")}</TableCell></TableRow> : dashboard.upcomingDepartures.data.map(departure => {
            const percentage = departure.capacity > 0 ? departure.occupied / departure.capacity * 100 : null;
            return <TableRow key={departure.id}>
              <TableCell><div className="flex items-center gap-3">
                {departure.image && <img src={departure.image} alt="" loading="lazy" className="size-10 shrink-0 rounded object-cover" />}
                <Link href={`/dashboard/publications/${departure.publicationId}`} className="min-w-0 rounded font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">{departure.title || t("Sin información")}<span className="sr-only"> · {t("Ver publicación")}</span></Link>
              </div></TableCell>
              <TableCell>{departure.agency || t("Sin información")}</TableCell>
              <TableCell><time dateTime={departure.startAt}>{formatDate(departure.startAt).split(/,\s*(?=\d{1,2}:)/u).map((part, index) => <span key={index} className="block whitespace-nowrap">{part}</span>)}</time></TableCell>
              <TableCell><div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm tabular-nums"><span className="font-medium">{number.format(departure.occupied)}/{number.format(departure.capacity)}</span>{percentage !== null && <span className="text-xs text-muted-foreground">{number.format(Math.round(percentage))}%</span>}</div>
                {percentage === null ? <p className="text-xs text-muted-foreground">{t("Capacidad no disponible")}</p> : <div role="progressbar" aria-label={t("Ocupación")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, percentage))} aria-valuetext={`${number.format(departure.occupied)}/${number.format(departure.capacity)}`} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} /></div>}
              </div></TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>}
      </CardContent>
    </Card>

    <Card className="min-w-0 gap-3 py-4 shadow-xs">
      <CardHeader><SectionHeading title={t("Reservas recientes")} description={t("Últimas cinco reservas registradas, de todos los períodos.")} actions={<Button variant="outline" size="sm" asChild><Link href="/dashboard/reservations">{t("Ver todas las reservas")}<ChevronRight aria-hidden="true" className="size-4" /></Link></Button>} /></CardHeader>
      <CardContent>
        {dashboard.reservations.loading ? <div aria-label={t("Cargando datos…")} className="space-y-3">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div> : dashboard.reservations.error ? <p role="alert" className="text-sm text-destructive">{t("No se pudieron cargar las reservas.")}</p> : <Table className="w-full table-fixed max-xl:min-w-[56rem] [&_th]:px-2! [&_td]:px-2! [&_td]:py-3! [&_th]:whitespace-normal! [&_td]:whitespace-normal! [&_th:nth-child(1)]:whitespace-nowrap! [&_td:nth-child(1)]:whitespace-nowrap! [&_th:nth-child(6)]:whitespace-nowrap! [&_td:nth-child(6)]:whitespace-nowrap! [&_th:nth-child(6)]:text-center [&_td:nth-child(6)]:text-center">
          <TableCaption className="sr-only">{t("Reservas recientes")}</TableCaption>
          <colgroup><col className="w-[9%]" /><col className="w-[17%]" /><col className="w-[17%]" /><col className="w-[16%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" /></colgroup>
          <TableHeader className="bg-muted/50"><TableRow>{["Reserva", "Experiencia", "Agencia", "Fecha de reserva", "Fecha de salida", "Personas", "Estado"].map(title => <TableHead scope="col" key={title}>{t(title)}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{dashboard.recent.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t("No hay reservas registradas.")}</TableCell></TableRow> : dashboard.recent.map(reservation => <TableRow key={reservation.id}>
            <TableCell><span title={reservation.id}>{reservation.id.slice(0, 8).toUpperCase()}</span><span className="sr-only">{reservation.id}</span></TableCell>
            <TableCell><span className="block whitespace-normal">{reservation.publicationTitle}</span></TableCell>
            <TableCell><span className="block whitespace-normal">{reservation.agencyName || t("Sin información")}</span></TableCell>
            {[reservation.createdAt, reservation.departureStartAt].map((date, index) => <TableCell key={index}><time dateTime={date}>{formatDate(date).split(/,\s*(?=\d{1,2}:)/u).map((part, partIndex) => <span key={partIndex} className="block whitespace-nowrap">{part}</span>)}</time></TableCell>)}<TableCell>{number.format(reservation.numberOfPeople)}</TableCell>
            <TableCell><Badge className="max-w-full whitespace-normal text-left" variant={reservation.status === "CANCELLED" ? "destructive" : reservation.status === "CONFIRMED" ? "default" : "secondary"}>{t(statusLabels[reservation.status] ?? reservation.status)}</Badge></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
      </CardContent>
    </Card>
  </div>;
}

function ExistingDashboard() {
  const { t } = usePreferences();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-primary lr-page-title">{t("Panel de Control ")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("Resumen operativo y accesos clave para LaRutica. ")}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" className="gap-2 shadow-xs" asChild>
            <Link href="/dashboard/graficas">
              <BarChart3 className="size-4" />{t("Ver gráficas ")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="transition-transform duration-200 hover:scale-[1.01]"
            >
              <Card className="h-full shadow-xs transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t(metric.label)}
                  </CardTitle>
                  <Icon className="size-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{metric.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{t(metric.note)}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("Accesos rápidos")}</h2>
          <p className="text-sm text-muted-foreground">{t("Navega a las secciones principales del panel. ")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="transition-transform duration-200 hover:scale-[1.01]"
              >
                <Card className="h-full shadow-xs transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-base">{t(link.title)}</CardTitle>
                      <CardDescription>{t(link.description)}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
