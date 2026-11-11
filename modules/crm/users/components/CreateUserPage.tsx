"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { emptyUserInput } from "../models/User";
import { useUsers } from "../hooks/useUsers";
import { UserForm } from "./UserForm";

export function CreateUserPage() {
  const { t } = usePreferences();
  const router = useRouter();
  const { role } = useDashboardRole();
  const { create } = useUsers();

  useEffect(() => {
    if (role !== "Admin") {
      router.replace("/dashboard/profile");
    }
  }, [role, router]);

  if (role !== "Admin") {
    return (
      <p className="text-sm text-muted-foreground">{t("Redirigiendo a tu perfil... ")}</p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Usuarios", href: "/dashboard/users" }, { label: "Nuevo usuario" }]} />
        <h1 className="lr-page-title">{t("Nuevo usuario ")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Crea una cuenta real en Supabase Auth y su perfil asociado. ")}</p>
      </div>

      <div className="bg-card rounded-xl p-5">
        <UserForm
          initialValue={emptyUserInput}
          submitLabel="Crear usuario"
          requirePassword
          onCancel={() => router.push("/dashboard/users")}
          onSubmit={async (value) => {
            const created = await create(value);
            router.push(`/dashboard/users/${created.id}`);
          }}
        />
      </div>
    </div>
  );
}
