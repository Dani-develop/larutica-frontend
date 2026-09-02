"use client";

import { cn } from "@/lib/utils";
import {
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";

type RoleSwitcherProps = {
  className?: string;
};

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const { role } = useDashboardRole();

  return <span className={cn("rounded-md border bg-background px-3 py-2 text-sm", className)}>Rol: {role}</span>;
}
