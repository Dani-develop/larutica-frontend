"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { useUsers } from "../hooks/useUsers";
import { UserForm } from "./UserForm";

export function EditUserPage({ id }: { id: string }) {
  const { t } = usePreferences();
  const router = useRouter();
  const { role } = useDashboardRole();
  const { getById, update, loading } = useUsers();
  const user = getById(id);

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

  if (loading) return <p className="text-sm text-muted-foreground">{t("Cargando usuario...")}</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Usuarios", href: "/dashboard/users" }, { label: "Editar usuario" }]} />
        <h1 className="lr-page-title">{t("Usuario no encontrado")}</h1>
      </div>
    );
  }

  const initialValue = {
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    businessName: user.businessName,
    status: user.status,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Usuarios", href: "/dashboard/users" }, { label: "Editar usuario" }]} />
        <h1 className="lr-page-title">{t("Editar usuario ")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.name}</p>
      </div>

      <div className="bg-card rounded-xl p-5">
        <UserForm
          initialValue={initialValue}
          submitLabel="Guardar cambios"
          onCancel={() => router.push(`/dashboard/users/${id}`)}
          onSubmit={async (value) => {
            await update(id, value);
            router.push(`/dashboard/users/${id}`);
          }}
        />
      </div>
    </div>
  );
}
