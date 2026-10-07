"use client";

import {
  useParams,
} from "next/navigation";

import {
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";

import {
  PublicationDetail,
} from "@/modules/publications/components/PublicationDetail";

import AdminPublicationDetail from "@/modules/publications/components/admin/admin-publication-detail";

import {
  RouteDetail,
} from "@/modules/transport/routes/components/RouteDetail";

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
      <RouteDetail
        id={id}
      />
    );
  }

  if (
    role ===
    "Admin"
  ) {
    return (
      <AdminPublicationDetail
        publicationId={
          id
        }
      />
    );
  }

  return (
    <PublicationDetail
      id={id}
    />
  );
}