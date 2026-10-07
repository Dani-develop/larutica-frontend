"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";

export default function Page() {
  const { t } = usePreferences();
  return (
    <DashboardSectionPage
      title={t("Promociones")}
      description={t("Consulta y gestiona servicios destacados.")}
    />
  );
}
