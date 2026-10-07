"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useVehicles } from "../hooks/useVehicles";
import type { VehicleInput } from "../models/Vehicle";
import { VehicleForm } from "./VehicleForm";

export function EditVehiclePage({ id }: { id: string }) {
  const { t } = usePreferences();
  const router = useRouter();
  const { getById, update } = useVehicles();
  const vehicle = getById(id);

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold">{t("Vehículo no encontrado")}</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/agencies">{t("Volver al listado")}</Link>
        </Button>
      </div>
    );
  }

  const initialValue: VehicleInput = {
    name: vehicle.name,
    type: vehicle.type,
    seats: vehicle.seats,
    plate: vehicle.plate,
    features: vehicle.features,
    photoUrl: vehicle.photoUrl,
    status: vehicle.status,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/agencies" className="hover:underline">{t("Vehículos ")}</Link>
          <span className="text-muted-foreground">{t(" / Editar")}</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("Editar vehículo ")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{vehicle.name}</p>
      </div>

      <VehicleForm
        initialValue={initialValue}
        submitLabel="Guardar cambios"
        onCancel={() => router.push(`/dashboard/agencies/${id}`)}
        onSubmit={(value) => {
          update(id, value);
          router.push(`/dashboard/agencies/${id}`);
        }}
      />
    </div>
  );
}
