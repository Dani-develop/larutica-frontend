"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useRouter } from "next/navigation";
import { emptyVehicleInput } from "../models/Vehicle";
import { useVehicles } from "../hooks/useVehicles";
import { VehicleForm } from "./VehicleForm";

export function CreateVehiclePage() {
  const { t } = usePreferences();
  const router = useRouter();
  const { create } = useVehicles();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <DashboardBreadcrumb items={[{ label: "Vehículos", href: "/dashboard/agencies" }, { label: "Nuevo vehículo" }]} />
        <h1 className="mt-1 lr-page-title">{t("Nuevo vehículo ")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Define tipo, asientos y placa para usarlo en tus rutas. ")}</p>
      </div>

      <VehicleForm
        initialValue={emptyVehicleInput}
        submitLabel="Crear vehículo"
        onCancel={() => router.push("/dashboard/agencies")}
        onSubmit={(value) => {
          const created = create(value);
          router.push(`/dashboard/agencies/${created.id}`);
        }}
      />
    </div>
  );
}
