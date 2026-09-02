import type { DashboardRole } from "@/components/dashboard/dashboard-role-context";

export type UserStatus = "Activo" | "Inactivo";

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  role: DashboardRole;
  phone: string;
  businessName: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type SystemUserInput = Omit<
  SystemUser,
  "id" | "createdAt" | "updatedAt"
> & { password?: string };

export const emptyUserInput: SystemUserInput = {
  name: "",
  email: "",
  role: "Viajero",
  phone: "",
  businessName: "",
  status: "Activo",
  password: "",
};
