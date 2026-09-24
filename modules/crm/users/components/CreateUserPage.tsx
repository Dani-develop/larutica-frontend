"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { emptyUserInput } from "../models/User";
import { useUsers } from "../hooks/useUsers";
import { UserForm } from "./UserForm";

export function CreateUserPage() {
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
      <p className="text-sm text-muted-foreground">
        Redirigiendo a tu perfil...
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/users" className="hover:underline">
            Usuarios
          </Link>
          <span className="text-muted-foreground"> / Nuevo</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Nuevo usuario
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea una cuenta real en Supabase Auth y su perfil asociado.
        </p>
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
