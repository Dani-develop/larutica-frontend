"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { Reservations } from "@/modules/booking/Reservations";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";

export default function Page() {
  const { t } = usePreferences();
  const { role } = useDashboardRole();
  if (role === "Viajero") return <Reservations worker />;
  return (
    <DashboardSectionPage
      title={t("Pendientes")}
      description={t("Publicaciones y contenido que requiere revisión.")}
    />
  );
}
