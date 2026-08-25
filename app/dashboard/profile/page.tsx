"use client";

import { MyProfilePage } from "@/modules/crm/users/components/MyProfilePage";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { TravelerProfilePage } from "@/components/dashboard/TravelerViews";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Viajero") return <TravelerProfilePage />;
  return <MyProfilePage />;
}
