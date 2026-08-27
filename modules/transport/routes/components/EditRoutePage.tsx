"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRoutes } from "../hooks/useRoutes";
import type { RouteInput } from "../models/Route";
import { routeTitle } from "../models/Route";
import { RouteForm } from "./RouteForm";

export function EditRoutePage({ id }: { id: string }) {
  const router = useRouter();
  const { getById, update } = useRoutes();
  const route = getById(id);

  if (!route) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold">Ruta no encontrada</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/publications">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  const initialValue: RouteInput = {
    origin: route.origin,
    destination: route.destination,
    coverUrl: route.coverUrl,
    excerpt: route.excerpt,
    includes: route.includes,
    duration: route.duration,
    vehicleId: route.vehicleId,
    vehicleType: route.vehicleType,
    seats: route.seats,
    priceUsd: route.priceUsd,
    providerName: route.providerName,
    status: route.status,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/publications" className="hover:underline">
            Rutas
          </Link>
          <span className="text-muted-foreground"> / Editar</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Editar ruta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{routeTitle(route)}</p>
      </div>

      <RouteForm
        initialValue={initialValue}
        submitLabel="Guardar cambios"
        onCancel={() => router.push(`/dashboard/publications/${id}`)}
        onSubmit={(value) => {
          update(id, value);
          router.push(`/dashboard/publications/${id}`);
        }}
      />
    </div>
  );
}
