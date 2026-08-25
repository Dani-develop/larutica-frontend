"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export const DASHBOARD_ROLES = [
  "Viajero",
  "Agencia",
  "Transporte",
  "Admin",
] as const;

export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

type DashboardRoleContextValue = {
  role: DashboardRole;
  setRole: (role: DashboardRole) => void;
};

const DashboardRoleContext = createContext<DashboardRoleContextValue | null>(
  null,
);

export function DashboardRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DashboardRole>("Admin");

  return (
    <DashboardRoleContext.Provider value={{ role, setRole }}>
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

export function demoUserForRole(role: DashboardRole) {
  const profiles: Record<
    DashboardRole,
    { username: string; email: string; role: DashboardRole }
  > = {
    Viajero: {
      username: "Ana Viajera",
      email: "ana@correo.com",
      role: "Viajero",
    },
    Agencia: {
      username: "Arenal Viajes",
      email: "hola@arenalviajes.cr",
      role: "Agencia",
    },
    Transporte: {
      username: "Transportes Sol",
      email: "contacto@transportessol.cr",
      role: "Transporte",
    },
    Admin: {
      username: "Administrador",
      email: "admin@larutica.cr",
      role: "Admin",
    },
  };

  return { ...profiles[role], avatarUrl: null as string | null };
}
