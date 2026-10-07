"use client";

import {
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";

import {
  PublicationsList,
} from "@/modules/publications/components/PublicationsList";

import AdminPublicationsPage from "@/modules/publications/components/admin/admin-publications-page";

import {
  RoutesList,
} from "@/modules/transport/routes/components/RoutesList";

export default function Page() {
  const {
    role,
  } =
    useDashboardRole();

  if (
    role ===
    "Transporte"
  ) {
    return (
      <RoutesList />
    );
  }

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