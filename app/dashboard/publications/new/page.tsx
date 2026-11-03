"use client";

import { CreatePublicationPage } from "@/modules/publications/components/CreatePublicationPage";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/lib/preferences/Preferences";
import { useAgency } from "@/modules/agency/hooks/useAgency";

export default function Page() {
  const { role } = useDashboardRole();
  return role === "Agencia" ? <AgencyPublicationEntry /> : <CreatePublicationPage />;
}

function AgencyPublicationEntry() {
  const { t } = usePreferences();
  const router = useRouter();
  const { agency, loading, error, loadAgency } = useAgency();
  const approved = agency?.status === "APPROVED";

  useEffect(() => {
    if (!loading && !error && !approved) router.replace("/dashboard/publications");
  }, [loading, error, approved, router]);

  if (error) return <div role="alert" className="space-y-3"><p>{t(error)}</p><Button variant="outline" onClick={() => void loadAgency()}>{t("Reintentar")}</Button></div>;
  if (loading || !approved) return <p role="status" className="text-sm text-muted-foreground">{t("Consultando tu agencia...")}</p>;
  return <CreatePublicationPage />;
}
