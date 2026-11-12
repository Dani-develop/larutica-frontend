"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useRouter } from "next/navigation";
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
        <DashboardBreadcrumb items={[{ label: "Vehículos", href: "/dashboard/agencies" }, { label: "Editar vehículo" }]} />
        <h1 className="lr-page-title">{t("Vehículo no encontrado")}</h1>
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
        <DashboardBreadcrumb items={[{ label: "Vehículos", href: "/dashboard/agencies" }, { label: "Editar vehículo" }]} />
        <h1 className="mt-1 lr-page-title">{t("Editar vehículo ")}</h1>
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
