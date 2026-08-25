"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { TravelerReservationsPage } from "@/components/dashboard/TravelerViews";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Viajero") return <TravelerReservationsPage />;
  return (
    <DashboardSectionPage
      title="Pendientes"
      description="Publicaciones y contenido que requiere revisión."
    />
  );
}
