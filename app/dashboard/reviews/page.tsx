"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { Reservations } from "@/modules/booking/Reservations";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Viajero") return <Reservations worker />;
  return (
    <DashboardSectionPage
      title="Pendientes"
      description="Publicaciones y contenido que requiere revisión."
    />
  );
}
