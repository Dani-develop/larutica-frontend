"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { TravelerExplorePage } from "@/components/dashboard/TravelerViews";
import { PublicationsList } from "@/modules/agency/publications/components/PublicationsList";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Viajero") return <TravelerExplorePage />;
  return <PublicationsList />;
}
