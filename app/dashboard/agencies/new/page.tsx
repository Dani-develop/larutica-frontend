"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { CreateVehiclePage } from "@/modules/transport/vehicles/components/CreateVehiclePage";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Transporte") return <CreateVehiclePage />;
  return (
    <DashboardSectionPage
      title="Agencias"
      description="Administra agencias verificadas y pendientes."
    />
  );
}
