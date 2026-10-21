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