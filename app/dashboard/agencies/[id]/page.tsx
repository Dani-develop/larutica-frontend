"use client";

import {
  useParams,
} from "next/navigation";

import {
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";

import {
  DashboardSectionPage,
} from "@/components/dashboard/DashboardSectionPage";

import AdminAgencyDetail from "@/modules/agency/components/admin/admin-agency-detail";

import {
  VehicleDetail,
} from "@/modules/transport/vehicles/components/VehicleDetail";

export default function Page() {
  const {
    role,
  } =
    useDashboardRole();

  const params =
    useParams<{
      id: string;
    }>();

  const id =
    typeof params?.id ===
    "string"
      ? params.id
      : "";

  if (
    role ===
    "Transporte"
  ) {
    return (
      <VehicleDetail
        id={id}
      />
    );
  }

  if (
    role ===
    "Admin"
  ) {
    return (
      <AdminAgencyDetail
        agencyId={id}
      />
    );
  }

  return (
    <DashboardSectionPage
      title="Agencias"
      description="Esta sección está disponible para administración."
    />
  );
}