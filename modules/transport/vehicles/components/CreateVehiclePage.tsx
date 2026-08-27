"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { emptyVehicleInput } from "../models/Vehicle";
import { useVehicles } from "../hooks/useVehicles";
import { VehicleForm } from "./VehicleForm";

export function CreateVehiclePage() {
  const router = useRouter();
  const { create } = useVehicles();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/agencies" className="hover:underline">
            Vehículos
          </Link>
          <span className="text-muted-foreground"> / Nuevo</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Nuevo vehículo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define tipo, asientos y placa para usarlo en tus rutas.
        </p>
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
