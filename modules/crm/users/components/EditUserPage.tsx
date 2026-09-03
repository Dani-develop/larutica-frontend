"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { Button } from "@/components/ui/button";
import { useUsers } from "../hooks/useUsers";
import { UserForm } from "./UserForm";

export function EditUserPage({ id }: { id: string }) {
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
      <p className="text-sm text-muted-foreground">
        Redirigiendo a tu perfil...
      </p>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando usuario...</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold">Usuario no encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/users">Volver al listado</Link>
        </Button>
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
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/users" className="hover:underline">
            Usuarios
          </Link>
          <span className="text-muted-foreground"> / Editar</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Editar usuario
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.name}</p>
      </div>

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
  );
}
