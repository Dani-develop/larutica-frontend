"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRoutes } from "../hooks/useRoutes";
import { routeTitle } from "../models/Route";
import { useVehicles } from "@/modules/transport/vehicles/hooks/useVehicles";
import { RouteStatusBadge } from "./RouteStatusBadge";

export function RouteDetail({ id }: { id: string }) {
  const { t } = usePreferences();
  const router = useRouter();
  const { getById, remove } = useRoutes();
  const { getById: getVehicleById } = useVehicles();
  const route = getById(id);
  const vehicle = route ? getVehicleById(route.vehicleId) : undefined;

  if (!route) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold">{t("Ruta no encontrada")}</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/publications">{t("Volver al listado")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            <Link href="/dashboard/publications" className="hover:underline">{t("Rutas ")}</Link>
            <span className="text-muted-foreground">{t(" / Detalle")}</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {routeTitle(route)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RouteStatusBadge status={route.status} />
            <span className="text-sm text-muted-foreground">
              {vehicle ? `${vehicle.name} · ${vehicle.type}` : route.vehicleType}{t(" ")}
              · {route.providerName}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/dashboard/publications/${route.id}/edit`}>
              <Pencil className="size-3.5" />{t("Editar ")}</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm(`¿Eliminar “${routeTitle(route)}”?`)) {
                remove(route.id);
                router.push("/dashboard/publications");
              }
            }}
          >
            <Trash2 className="size-3.5" />{t("Eliminar ")}</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={route.coverUrl}
          alt={routeTitle(route)}
          className="h-64 w-full object-cover"
        />
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>{t("Resumen")}</CardTitle>
          <CardDescription>{route.excerpt}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold">{t("Qué incluye")}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {route.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("Duración")}</p>
              <p className="font-medium">{route.duration}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("Vehículo")}</p>
              <p className="font-medium">
                {vehicle ? `${vehicle.name} · ${vehicle.type}` : route.vehicleType}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("Precio / persona")}</p>
              <p className="font-medium">${route.priceUsd}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("Asientos")}</p>
              <p className="font-medium">{route.seats}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
