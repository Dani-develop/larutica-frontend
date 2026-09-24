"use client";

import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { CreatePublicationPage } from "@/modules/publications/components/CreatePublicationPage";
import { CreateRoutePage } from "@/modules/transport/routes/components/CreateRoutePage";

export default function Page() {
  const { role } = useDashboardRole();
  if (role === "Transporte") return <CreateRoutePage />;
  return <CreatePublicationPage />;
}
