"use client";

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
import { useVehicles } from "../hooks/useVehicles";
import { VehicleStatusBadge } from "./VehicleStatusBadge";

export function VehicleDetail({ id }: { id: string }) {
  const router = useRouter();
  const { getById, remove } = useVehicles();
  const vehicle = getById(id);

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold">Vehículo no encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/agencies">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            <Link href="/dashboard/agencies" className="hover:underline">
              Vehículos
            </Link>
            <span className="text-muted-foreground"> / Detalle</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {vehicle.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VehicleStatusBadge status={vehicle.status} />
            <span className="text-sm text-muted-foreground">
              {vehicle.type}
              {vehicle.plate ? ` · ${vehicle.plate}` : ""}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
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
              if (window.confirm(`¿Eliminar “${vehicle.name}”?`)) {
                remove(vehicle.id);
                router.push("/dashboard/agencies");
              }
            }}
          >
            <Trash2 className="size-3.5" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vehicle.photoUrl}
          alt={vehicle.name}
          className="h-64 w-full object-cover"
        />
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Ficha</CardTitle>
          <CardDescription>
            Estos datos se usan al asignar el vehículo a una ruta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Equipamiento</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {vehicle.features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium">{vehicle.type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Asientos</p>
              <p className="font-medium">{vehicle.seats}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Placa</p>
              <p className="font-medium">{vehicle.plate || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
