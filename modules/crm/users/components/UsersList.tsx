"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUsers } from "../hooks/useUsers";
import { UserStatusBadge } from "./UserStatusBadge";

export function UsersList() {
  const router = useRouter();
  const { role } = useDashboardRole();
  const { users, remove } = useUsers();

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo administración puede ver y gestionar las cuentas del sistema.
          </p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto">
          <Link href="/dashboard/users/new">
            <Plus className="size-4" />
            Nuevo usuario
          </Link>
        </Button>
      </div>

      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Cuentas registradas</CardTitle>
          <CardDescription>
            {users.length} usuario{users.length === 1 ? "" : "s"} en el
            prototipo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/users/${user.id}`}
                        className="font-medium hover:underline"
                      >
                        {user.name}
                      </Link>
                      {user.businessName ? (
                        <p className="text-xs text-muted-foreground">
                          {user.businessName}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/users/${user.id}`}>Ver</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-1.5"
                        >
                          <Link href={`/dashboard/users/${user.id}/edit`}>
                            <Pencil className="size-3.5" />
                            Editar
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={user.role === "Admin" && user.email === "admin@larutica.cr"}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Eliminar a “${user.name}”? Acción de ejemplo.`,
                              )
                            ) {
                              remove(user.id);
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
