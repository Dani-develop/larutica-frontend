"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAuth } from "@/modules/auth/context/AuthContext";

export const DASHBOARD_ROLES = [
  "Viajero",
  "Agencia",
  "Transporte",
  "Admin",
] as const;

export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

type DashboardRoleContextValue = {
  role: DashboardRole;
};

const DashboardRoleContext = createContext<DashboardRoleContextValue | null>(
  null,
);

export function DashboardRoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role = user?.role ?? "Viajero";

  return (
    <DashboardRoleContext.Provider value={{ role }}>
      {children}
    </DashboardRoleContext.Provider>
  );
}

export function useDashboardRole() {
  const context = useContext(DashboardRoleContext);
  if (!context) {
    throw new Error(
      "useDashboardRole must be used within a DashboardRoleProvider.",
    );
  }
  return context;
}
