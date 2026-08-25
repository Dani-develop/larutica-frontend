"use client";

import { useMemo, useState } from "react";
import {
  demoUserForRole,
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUsers } from "../hooks/useUsers";
import { UserForm } from "./UserForm";
import { UserStatusBadge } from "./UserStatusBadge";

export function MyProfilePage() {
  const { role } = useDashboardRole();
  const demo = demoUserForRole(role);
  const { getByEmail, getByRoleDemo, update } = useUsers();
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState(false);

  const profile = useMemo(() => {
    return getByEmail(demo.email) ?? getByRoleDemo(role);
  }, [demo.email, getByEmail, getByRoleDemo, role]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          No se encontró un perfil asociado a la vista actual.
        </p>
      </div>
    );
  }

  const { id, createdAt: _c, updatedAt: _u, ...initialValue } = profile;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo puedes editar tu propia información. El listado de usuarios es
          exclusivo de Admin.
        </p>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">{profile.name}</CardTitle>
            <CardDescription>
              {profile.role}
              {profile.businessName ? ` · ${profile.businessName}` : ""}
            </CardDescription>
          </div>
          <UserStatusBadge status={profile.status} />
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {profile.email}
        </CardContent>
      </Card>

      {saved ? (
        <p className="text-sm text-primary" role="status">
          Perfil actualizado (ejemplo en memoria).
        </p>
      ) : null}

      <UserForm
        key={`${id}-${formKey}`}
        initialValue={initialValue}
        submitLabel="Guardar perfil"
        lockRole
        onCancel={() => {
          setSaved(false);
          setFormKey((current) => current + 1);
        }}
        onSubmit={(value) => {
          update(id, { ...value, role: profile.role });
          setSaved(true);
          setFormKey((current) => current + 1);
        }}
      />
    </div>
  );
}
