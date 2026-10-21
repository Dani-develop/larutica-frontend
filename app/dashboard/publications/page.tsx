"use client";

import {
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";

import {
  PublicationsList,
} from "@/modules/publications/components/PublicationsList";

import AdminPublicationsPage from "@/modules/publications/components/admin/admin-publications-page";


export default function Page() {
  const {
    role,
  } =
    useDashboardRole();


  if (
    role ===
    "Admin"
  ) {
    return (
      <AdminPublicationsPage />
    );
  }

  return (
    <PublicationsList />
  );
}