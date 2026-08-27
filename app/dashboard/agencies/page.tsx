"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { VehiclesList } from "@/modules/transport/vehicles/components/VehiclesList";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Transporte") return <VehiclesList />;
  return (
    <DashboardSectionPage
      title="Agencias"
      description="Administra agencias verificadas y pendientes."
    />
  );
}
