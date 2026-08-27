"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVehicles } from "../hooks/useVehicles";
import { vehicleLabel } from "../models/Vehicle";
import { VehicleStatusBadge } from "./VehicleStatusBadge";

export function VehiclesList() {
  const { vehicles, remove } = useVehicles();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mis vehículos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra la flota y elige el vehículo al publicar una ruta.
          </p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto">
          <Link href="/dashboard/agencies/new">
            <Plus className="size-4" />
            Nuevo vehículo
          </Link>
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Sin vehículos</CardTitle>
            <CardDescription>
              Crea el primero para asignarlo a tus rutas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden shadow-xs">
              <div className="relative h-44 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vehicle.photoUrl}
                  alt={vehicle.name}
                  className="size-full object-cover"
                />
                <div className="absolute left-3 top-3">
                  <VehicleStatusBadge status={vehicle.status} />
                </div>
              </div>
              <CardHeader className="space-y-2">
                <CardDescription className="uppercase tracking-wide">
                  {vehicle.type}
                  {vehicle.plate ? ` · ${vehicle.plate}` : ""}
                </CardDescription>
                <CardTitle className="text-base leading-snug">
                  <Link
                    href={`/dashboard/agencies/${vehicle.id}`}
                    className="hover:underline"
                  >
                    {vehicle.name}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {vehicle.seats} asientos
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {vehicleLabel(vehicle)}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/agencies/${vehicle.id}`}>Ver</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1.5"
                  >
                    <Link href={`/dashboard/agencies/${vehicle.id}/edit`}>
                      <Pencil className="size-3.5" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Eliminar “${vehicle.name}”? Esta acción es solo de ejemplo.`,
                        )
                      ) {
                        remove(vehicle.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
