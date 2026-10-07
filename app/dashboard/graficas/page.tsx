"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";

export default function Page() {
  const { t } = usePreferences();
  return (
    <DashboardSectionPage
      title={t("Gráficas")}
      description={t("Indicadores y tendencias de la plataforma.")}
    />
  );
}
