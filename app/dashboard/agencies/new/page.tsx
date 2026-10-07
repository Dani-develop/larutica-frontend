"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { CreateVehiclePage } from "@/modules/transport/vehicles/components/CreateVehiclePage";

export default function Page() {
  const { t } = usePreferences();
  const { role } = useDashboardRole();
  if (role === "Transporte") return <CreateVehiclePage />;
  return (
    <DashboardSectionPage
      title={t("Agencias")}
      description={t("Administra agencias verificadas y pendientes.")}
    />
  );
}
