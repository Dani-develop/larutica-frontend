"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { getInitials } from "@/components/app-sidebar/user-avatar-utils";
import {
  DASHBOARD_ROLES,
  useDashboardRole,
  type DashboardRole,
} from "@/components/dashboard/dashboard-role-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { useUsers } from "../hooks/useUsers";
import type { SystemUser, UserStatus } from "../models/User";
import { UserStatusBadge } from "./UserStatusBadge";

const ALL_ROLES = "Todos los roles" as const;
const ALL_STATUSES = "Todos los estados" as const;

const roleStyles: Record<DashboardRole, string> = {
  Admin: "bg-amber-50 text-amber-800 ring-amber-700/10",
  Agencia: "bg-sky-50 text-sky-800 ring-sky-700/10",
  Transporte: "bg-violet-50 text-violet-800 ring-violet-700/10",
  Viajero: "bg-emerald-50 text-emerald-800 ring-emerald-700/10",
};

const roleIcons: Record<DashboardRole, typeof UserRound> = {
  Admin: ShieldCheck,
  Agencia: Building2,
  Transporte: UsersRound,
  Viajero: UserRound,
};

function RoleBadge({ role }: { role: DashboardRole }) {
  const Icon = roleIcons[role];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        roleStyles[role],
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {role}
    </span>
  );
}

function UserAvatar({ user }: { user: SystemUser }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary ring-1 ring-primary/10"
    >
      {getInitials(user.name, user.email)}
    </span>
  );
}

function UserActions({
  user,
  canDelete,
  onDelete,
}: {
  user: SystemUser;
  canDelete: boolean;
  onDelete: (user: SystemUser) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Acciones para ${user.name}`}
          className="text-muted-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" header={`Acciones para ${user.name}`}>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/users/${user.id}`}>
            <UserRound aria-hidden="true" />
            Ver perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/users/${user.id}/edit`}>
            <Pencil aria-hidden="true" />
            Editar usuario
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canDelete}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={() => onDelete(user)}
        >
          <Trash2 aria-hidden="true" />
          Eliminar usuario
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteUserDialog({
  user,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  user: SystemUser;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel();
      }}
    >
      <section
        aria-describedby="delete-user-description"
        aria-labelledby="delete-user-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl"
        role="alertdialog"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-user-title" className="!text-lg !font-semibold !leading-6 !tracking-normal">
              Eliminar usuario
            </h2>
            <p id="delete-user-description" className="mt-2 text-sm leading-6 text-muted-foreground">
              Se eliminará la cuenta de <strong className="font-semibold text-foreground">{user.name}</strong> y perderá el acceso a LaRutica. Esta acción no se puede deshacer.
            </p>
          </div>
          <Button
            aria-label="Cerrar confirmación"
            disabled={deleting}
            onClick={onCancel}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={deleting} onClick={onCancel} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={deleting} onClick={onConfirm} type="button" variant="destructive">
            {deleting ? "Eliminando…" : "Sí, eliminar usuario"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function UsersLoadingState() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-label="Cargando usuarios" aria-busy="true">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-80 max-w-[75vw]" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-24 rounded-xl" key={index} />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export function UsersList() {
  const router = useRouter();
  const { role } = useDashboardRole();
  const { user: sessionUser } = useAuth();
  const { users, loading, error, remove, refresh } = useUsers();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<DashboardRole | typeof ALL_ROLES>(ALL_ROLES);
  const [statusFilter, setStatusFilter] = useState<UserStatus | typeof ALL_STATUSES>(ALL_STATUSES);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "Admin") router.replace("/dashboard/profile");
  }, [role, router]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        [user.name, user.email, user.businessName]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      const matchesRole = roleFilter === ALL_ROLES || user.role === roleFilter;
      const matchesStatus = statusFilter === ALL_STATUSES || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const activeCount = users.filter((user) => user.status === "Activo").length;
  const adminCount = users.filter((user) => user.role === "Admin").length;
  const hasFilters = Boolean(query) || roleFilter !== ALL_ROLES || statusFilter !== ALL_STATUSES;

  const clearFilters = () => {
    setQuery("");
    setRoleFilter(ALL_ROLES);
    setStatusFilter(ALL_STATUSES);
  };

  const canDelete = (user: SystemUser) => user.id !== sessionUser?.id;

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      setActionError(null);
      await remove(userToDelete.id);
      setUserToDelete(null);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "No se pudo eliminar el usuario.");
    } finally {
      setDeleting(false);
    }
  };

  if (role !== "Admin") {
    return <p className="text-sm text-muted-foreground">Redirigiendo a tu perfil…</p>;
  }

  if (loading) return <UsersLoadingState />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-1 text-sm font-semibold text-primary">Administración</p>
          <h1 className="!max-w-none !text-3xl !font-bold !leading-tight !tracking-[-0.03em] sm:!text-4xl">
            Gestión de usuarios
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Consulta, organiza y administra las cuentas con acceso a LaRutica.
          </p>
        </div>
        <Button asChild className="h-10 w-full gap-2 shadow-sm sm:w-auto">
          <Link href="/dashboard/users/new">
            <Plus aria-hidden="true" className="size-4" />
            Crear usuario
          </Link>
        </Button>
      </header>

      <section aria-label="Resumen de usuarios" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Total de usuarios</p>
            <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <UsersRound aria-hidden="true" className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">{users.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Cuentas activas</p>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">{activeCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Administradores</p>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <ShieldCheck aria-hidden="true" className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">{adminCount}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs" aria-labelledby="users-table-title">
        <div className="border-b p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="users-table-title" className="!text-base !font-semibold !leading-6 !tracking-normal">
                Directorio de usuarios
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {filteredUsers.length === users.length
                  ? `${users.length} cuenta${users.length === 1 ? "" : "s"} registrada${users.length === 1 ? "" : "s"}`
                  : `${filteredUsers.length} de ${users.length} cuentas`}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto] lg:w-auto">
              <div className="relative sm:min-w-64">
                <label className="sr-only" htmlFor="search-users">Buscar usuarios</label>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-users"
                  className="h-10 bg-background pl-9 pr-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre o correo"
                  type="search"
                  value={query}
                />
                {query ? (
                  <button
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setQuery("")}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>

              <label className="relative">
                <span className="sr-only">Filtrar por rol</span>
                <select
                  className="h-10 w-full appearance-none rounded-md border bg-background py-2 pl-3 pr-9 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  onChange={(event) => setRoleFilter(event.target.value as DashboardRole | typeof ALL_ROLES)}
                  value={roleFilter}
                >
                  <option>{ALL_ROLES}</option>
                  {DASHBOARD_ROLES.map((dashboardRole) => <option key={dashboardRole}>{dashboardRole}</option>)}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </label>

              <label className="relative">
                <span className="sr-only">Filtrar por estado</span>
                <select
                  className="h-10 w-full appearance-none rounded-md border bg-background py-2 pl-3 pr-9 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  onChange={(event) => setStatusFilter(event.target.value as UserStatus | typeof ALL_STATUSES)}
                  value={statusFilter}
                >
                  <option>{ALL_STATUSES}</option>
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </label>
            </div>
          </div>
        </div>

        {error ? (
          <div className="m-4 flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => void refresh()} size="sm" type="button" variant="outline">Intentar de nuevo</Button>
          </div>
        ) : null}

        {filteredUsers.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/35 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Organización</th>
                    <th className="w-16 px-5 py-3 text-right font-medium"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr className="group transition-colors hover:bg-muted/30" key={user.id}>
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <Link className="block truncate font-semibold text-foreground hover:text-primary hover:underline" href={`/dashboard/users/${user.id}`}>
                              {user.name}
                            </Link>
                            <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-4"><UserStatusBadge status={user.status} /></td>
                      <td className="max-w-52 truncate px-4 py-4 text-muted-foreground">{user.businessName || "—"}</td>
                      <td className="px-5 py-4 text-right">
                        <UserActions canDelete={canDelete(user)} onDelete={setUserToDelete} user={user} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y md:hidden">
              {filteredUsers.map((user) => (
                <article className="p-4" key={user.id}>
                  <div className="flex items-start gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <Link className="block truncate font-semibold hover:text-primary hover:underline" href={`/dashboard/users/${user.id}`}>
                        {user.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <UserActions canDelete={canDelete(user)} onDelete={setUserToDelete} user={user} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-[3.25rem]">
                    <RoleBadge role={user.role} />
                    <UserStatusBadge status={user.status} />
                  </div>
                  {user.businessName ? <p className="mt-3 pl-[3.25rem] text-xs text-muted-foreground">{user.businessName}</p> : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold">No encontramos usuarios</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Prueba con otro nombre, correo, rol o estado.
            </p>
            {hasFilters ? <Button className="mt-4" onClick={clearFilters} size="sm" type="button" variant="outline">Limpiar filtros</Button> : null}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Por seguridad, no puedes eliminar tu propia cuenta mientras tienes la sesión iniciada.
      </p>

      {userToDelete ? (
        <DeleteUserDialog
          deleting={deleting}
          error={actionError}
          onCancel={() => {
            setActionError(null);
            setUserToDelete(null);
          }}
          onConfirm={() => void confirmDelete()}
          user={userToDelete}
        />
      ) : null}
    </div>
  );
}
