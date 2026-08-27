"use client";

import { useParams } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { EditVehiclePage } from "@/modules/transport/vehicles/components/EditVehiclePage";

export default function Page() {
  const { role } = useDashboardRole();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  if (role === "Transporte") return <EditVehiclePage id={id} />;
  return (
    <DashboardSectionPage
      title="Agencias"
      description="Administra agencias verificadas y pendientes."
    />
  );
}
