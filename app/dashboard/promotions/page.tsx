"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { TravelerSavedPage } from "@/components/dashboard/TravelerViews";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Viajero") return <TravelerSavedPage />;
  return (
    <DashboardSectionPage
      title="Promociones"
      description="Consulta y gestiona servicios destacados."
    />
  );
}
