"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  MapPin,
  Megaphone,
  Users,
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
