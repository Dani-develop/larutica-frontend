"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";

export default function Page() {
  const { t } = usePreferences();
  return (
    <DashboardSectionPage
      title={t("Destinos")}
      description={t("Crea y actualiza destinos disponibles en LaRutica.")}
    />
  );
}
