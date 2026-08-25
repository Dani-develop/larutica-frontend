"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import {
  TravelerDetailsPage,
  TravelerPurchasePage,
} from "@/components/dashboard/TravelerViews";
import { PublicationDetail } from "@/modules/agency/publications/components/PublicationDetail";

export default function Page() {
  const { role } = useDashboardRole();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  if (role === "Viajero" && searchParams.get("mode") === "details") {
    return <TravelerDetailsPage publicationId={id} />;
  }
  if (role === "Viajero") return <TravelerPurchasePage publicationId={id} />;
  return <PublicationDetail id={id} />;
}
