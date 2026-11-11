"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { parsePhoneNumber } from "react-phone-number-input";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { Button } from "@/components/ui/button";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUsers } from "../hooks/useUsers";
import { UserStatusBadge } from "./UserStatusBadge";

function formatPhone(phone: string): string {
  try {
    return parsePhoneNumber(phone)?.formatInternational() ?? phone;
  } catch {
    return phone;
  }
}

export function UserDetail({ id }: { id: string }) {
  const { t } = usePreferences();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { role } = useDashboardRole();
  const { getById, remove, loading } = useUsers();
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
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Usuarios", href: "/dashboard/users" }, { label: "Detalle" }]} />
        <h1 className="lr-page-title">{t("Usuario no encontrado")}</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/users">{t("Volver al listado")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("Eliminar usuario")}
        description={`${t("¿Eliminar a")} “${user.name}”? ${t("Esta acción no se puede deshacer.")}`}
        confirmLabel={t("Eliminar")}
        pendingLabel={t("Eliminando…")}
        onConfirm={async () => {
          await remove(user.id);
          router.push("/dashboard/users");
        }}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <DashboardBreadcrumb className="mb-2" items={[{ label: "Usuarios", href: "/dashboard/users" }, { label: "Detalle" }]} />
          <h1 className="lr-page-title">
            {user.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <UserStatusBadge status={user.status} />
            <span className="text-sm text-muted-foreground">{t(user.role)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/dashboard/users/${user.id}/edit`}>
              <Pencil className="size-3.5" />{t("Editar ")}</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-3.5" />{t("Eliminar ")}</Button>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">{t("Información")}</CardTitle>
          <CardDescription>{t("Datos sincronizados con la cuenta en la nube.")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("Correo")}</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Teléfono")}</p>
            <p className="text-sm font-medium">
              {user.phone ? formatPhone(user.phone) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Rol")}</p>
            <p className="text-sm font-medium">{t(user.role)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Negocio")}</p>
            <p className="text-sm font-medium">{user.businessName || "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
