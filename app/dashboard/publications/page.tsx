"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { TravelerExplorePage } from "@/components/dashboard/TravelerViews";
import { PublicationsList } from "@/modules/publications/components/PublicationsList";
import { RoutesList } from "@/modules/transport/routes/components/RoutesList";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Viajero") return <TravelerExplorePage />;
  if (role === "Transporte") return <RoutesList />;
  return <PublicationsList />;
}
