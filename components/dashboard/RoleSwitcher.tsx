"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_ROLES,
  useDashboardRole,
  type DashboardRole,
} from "@/components/dashboard/dashboard-role-context";

type RoleSwitcherProps = {
  className?: string;
};

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const router = useRouter();
  const { role, setRole } = useDashboardRole();

  return (
    <label className={cn("flex items-center gap-2", className)}>
      <span className="sr-only">Cambiar vista de rol</span>
      <select
        value={role}
        onChange={(event) => {
          setRole(event.target.value as DashboardRole);
          router.push("/dashboard");
        }}
        className={cn(
          "border-input h-9 min-w-40 rounded-md border bg-background px-3 py-1 text-sm shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        )}
      >
        {DASHBOARD_ROLES.map((item) => (
          <option key={item} value={item}>
            Vista: {item}
          </option>
        ))}
      </select>
    </label>
  );
}
