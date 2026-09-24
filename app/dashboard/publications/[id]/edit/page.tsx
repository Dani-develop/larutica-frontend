"use client";

import { useParams } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { EditPublicationPage } from "@/modules/publications/components/EditPublicationPage";
import { EditRoutePage } from "@/modules/transport/routes/components/EditRoutePage";

export default function Page() {
  const { role } = useDashboardRole();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  if (role === "Transporte") return <EditRoutePage id={id} />;
  return <EditPublicationPage id={id} />;
}
