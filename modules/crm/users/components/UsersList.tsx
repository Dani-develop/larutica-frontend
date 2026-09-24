"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Home,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  UserX,
  X,
} from "lucide-react";
import { getInitials } from "@/components/app-sidebar/user-avatar-utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DASHBOARD_ROLES,
  useDashboardRole,
  type DashboardRole,
} from "@/components/dashboard/dashboard-role-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { useUsers } from "../hooks/useUsers";
import type { SystemUser, UserStatus } from "../models/User";

const roleBadgeClass: Record<DashboardRole, string> = {
  Admin: "bg-blue-100 text-blue-700 border-blue-200",
  Agencia: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Transporte: "bg-amber-100 text-amber-700 border-amber-200",
  Viajero: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusBadgeClass: Record<UserStatus, string> = {
  Activo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Inactivo: "bg-slate-100 text-slate-600 border-slate-200",
};

function RoleBadge({ role }: { role: DashboardRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium",
        roleBadgeClass[role],
      )}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium",
        statusBadgeClass[status],
      )}
    >
      {status}
    </span>
  );
}

function UserAvatar({ user }: { user: SystemUser }) {
  return (
    <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
      <span className="text-primary !text-xs !font-semibold">
        {getInitials(user.name, user.email)}
      </span>
    </div>
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
        className="bg-background w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        role="alertdialog"
      >
        <div className="flex items-start gap-4">
          <span className="bg-destructive/10 text-destructive flex size-11 shrink-0 items-center justify-center rounded-full">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="delete-user-title"
              className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal"
            >
              Eliminar usuario
            </h2>
            <p
              id="delete-user-description"
              className="text-muted-foreground mt-2 !text-sm !leading-5"
            >
              Se eliminará la cuenta de{" "}
              <strong className="text-foreground font-semibold">{user.name}</strong>{" "}
              y perderá el acceso a LaRutica. Esta acción no se puede deshacer.
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
          <p
            className="bg-destructive/10 text-destructive mt-4 rounded-lg px-3 py-2 text-sm"
            role="alert"
          >
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

function paginationBtnClass(enabled: boolean) {
  return cn(
    "flex size-9 items-center justify-center rounded-full border bg-background shadow-sm transition-colors",
    enabled
      ? "cursor-pointer hover:bg-muted active:bg-muted"
      : "pointer-events-none opacity-40",
  );
}

export function UsersList() {
  const router = useRouter();
  const { role } = useDashboardRole();
  const { user: sessionUser } = useAuth();
  const { users, loading, error, remove, refresh } = useUsers();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<DashboardRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "Admin") router.replace("/dashboard/profile");
  }, [role, router]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const next = users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        [user.name, user.email, user.phone, user.businessName]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });

    next.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortDir === "DESC" ? bTime - aTime : aTime - bTime;
    });

    return next;
  }, [query, roleFilter, sortDir, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / limit));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  const hasActiveFilters =
    Boolean(roleFilter) ||
    Boolean(statusFilter) ||
    sortDir !== "DESC" ||
    limit !== 10;

  const clearFilters = () => {
    setRoleFilter("");
    setStatusFilter("");
    setSortDir("DESC");
    setLimit(10);
    setPage(1);
    setQuery("");
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
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo eliminar el usuario.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (role !== "Admin") {
    return (
      <p className="text-muted-foreground text-sm">Redirigiendo a tu perfil…</p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList className="!text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard" className="flex items-center gap-1.5 !text-sm">
              <Home className="size-3.5" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="!text-sm">Usuarios</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <h1 className="!m-0 !max-w-none !text-2xl !leading-8 !font-semibold !tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-0.5 !text-sm !leading-5">
            {loading
              ? "Administra los usuarios del sistema"
              : `${users.length} usuarios registrados`}
          </p>
        </div>
        <Button asChild className="shrink-0 !text-sm">
          <Link href="/dashboard/users/new">
            <User className="size-4" />
            Crear Usuario
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="!h-9 !text-sm pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, email, teléfono..."
            type="search"
            value={query}
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="shrink-0 gap-2 !text-sm">
              <SlidersHorizontal className="size-4" />
              Filtros
              {hasActiveFilters ? (
                <span className="bg-primary size-2 rounded-full" />
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[320px] flex-col gap-0 p-0 sm:w-[360px] sm:max-w-[360px]"
          >
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal">
                Filtros
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              <div className="flex flex-col gap-2">
                <Label className="!text-sm !font-medium">Rol</Label>
                <Select
                  value={roleFilter || "all"}
                  onValueChange={(value) => {
                    setRoleFilter(value === "all" ? "" : (value as DashboardRole));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full !text-sm">
                    <SelectValue placeholder="Todos los roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    {DASHBOARD_ROLES.map((dashboardRole) => (
                      <SelectItem key={dashboardRole} value={dashboardRole}>
                        {dashboardRole}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label className="!text-sm !font-medium">Estado</Label>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(value) => {
                    setStatusFilter(value === "all" ? "" : (value as UserStatus));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full !text-sm">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label className="!text-sm !font-medium">Ordenar por</Label>
                <Select
                  value={sortDir}
                  onValueChange={(value: "ASC" | "DESC") => {
                    setSortDir(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full !text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESC">Más nuevos primero</SelectItem>
                    <SelectItem value="ASC">Más antiguos primero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label className="!text-sm !font-medium">Resultados por página</Label>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full !text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 10, 15, 20].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} resultados
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button
                variant="ghost"
                className="text-muted-foreground w-full !text-sm"
                onClick={clearFilters}
                type="button"
              >
                Limpiar filtros
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {error ? (
        <div
          className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="text-destructive text-sm">{error}</p>
          <Button onClick={() => void refresh()} size="sm" type="button" variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      ) : null}

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="ml-auto hidden h-4 w-40 sm:block" />
                <Skeleton className="hidden h-5 w-16 rounded-full md:block" />
              </div>
            ))}
          </div>
        ) : pageUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="bg-muted flex size-14 items-center justify-center rounded-full">
              <UserX className="text-muted-foreground/30 size-7" />
            </div>
            <p className="!text-sm !font-medium">No se encontraron usuarios</p>
            <p className="text-muted-foreground !text-xs">
              Prueba ajustando los filtros de búsqueda
            </p>
            {hasActiveFilters || query ? (
              <Button
                className="mt-1"
                onClick={clearFilters}
                size="sm"
                type="button"
                variant="outline"
              >
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-muted-foreground !py-3 !text-[11px] !font-semibold !tracking-wider uppercase">
                  Usuario
                </TableHead>
                <TableHead className="text-muted-foreground !py-3 !text-[11px] !font-semibold !tracking-wider uppercase">
                  Email
                </TableHead>
                <TableHead className="text-muted-foreground hidden !py-3 !text-[11px] !font-semibold !tracking-wider uppercase md:table-cell">
                  Teléfono
                </TableHead>
                <TableHead className="text-muted-foreground !py-3 !text-[11px] !font-semibold !tracking-wider uppercase">
                  Rol
                </TableHead>
                <TableHead className="text-muted-foreground hidden !py-3 !text-[11px] !font-semibold !tracking-wider uppercase sm:table-cell">
                  Estado
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="!py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <span className="!text-sm !font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="!py-3">
                    <span className="text-muted-foreground !text-sm">
                      {user.email || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden !py-3 md:table-cell">
                    <span className="!text-sm tabular-nums">{user.phone || "—"}</span>
                  </TableCell>
                  <TableCell className="!py-3">
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="hidden !py-3 sm:table-cell">
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="!py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acciones para {user.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 !text-sm">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/users/${user.id}`}>
                            <Eye className="size-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/users/${user.id}/edit`}>
                            <Pencil className="size-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canDelete(user)}
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setUserToDelete(user)}
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {!loading && filteredUsers.length > 0 ? (
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Ir a la página anterior"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className={paginationBtnClass(currentPage > 1)}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="bg-muted/50 rounded-full border px-3 py-1 !text-sm !font-medium tabular-nums">
            Pág. {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Ir a la página siguiente"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className={paginationBtnClass(currentPage < totalPages)}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

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
