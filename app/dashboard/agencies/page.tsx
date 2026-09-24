"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Home,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  UserX,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAdminAgencies } from "@/modules/agency/hooks/admin/useAdminAgencies";
import type {
  Agency,
  AgencyStatus,
  BusinessType,
} from "@/modules/agency/types/agency.types";

type StatusFilter = AgencyStatus | "";

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "", label: "Todos los estados" },
  { value: "PENDING", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "REJECTED", label: "Rechazadas" },
  { value: "DRAFT", label: "Borradores" },
  { value: "INACTIVE", label: "Inactivas" },
];

const statusBadgeClass: Record<AgencyStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
};

const statusLabel: Record<AgencyStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  INACTIVE: "Inactiva",
};

function businessTypeLabel(value: BusinessType) {
  switch (value) {
    case "AGENCY":
      return "Agencia";
    case "TOUR_OPERATOR":
      return "Operador turístico";
    case "TRANSPORT":
      return "Transporte";
    case "INDEPENDENT_GUIDE":
      return "Guía independiente";
    default:
      return value;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ status }: { status: AgencyStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium",
        statusBadgeClass[status],
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

function AgencyAvatar({ agency }: { agency: Agency }) {
  return (
    <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
      {agency.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agency.logoUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <Building2 className="size-4" aria-hidden="true" />
      )}
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

export default function AdminAgenciesPage() {
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      status: status || undefined,
      search: search.trim() || undefined,
    }),
    [status, search],
  );

  const { agencies, loading, error, loadAgencies } = useAdminAgencies(filters);

  const sortedAgencies = useMemo(() => {
    const next = [...agencies];
    next.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortDir === "DESC" ? bTime - aTime : aTime - bTime;
    });
    return next;
  }, [agencies, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedAgencies.length / limit));
  const currentPage = Math.min(page, totalPages);
  const pageAgencies = sortedAgencies.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  const hasActiveFilters =
    Boolean(status) || sortDir !== "DESC" || limit !== 10;

  const clearFilters = () => {
    setStatus("");
    setSortDir("DESC");
    setLimit(10);
    setPage(1);
    setSearch("");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList className="!text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="flex items-center gap-1.5 !text-sm"
            >
              <Home className="size-3.5" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="!text-sm">Agencias</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <h1 className="!m-0 !max-w-none !text-2xl !leading-8 !font-semibold !tracking-tight">
            Gestión de Agencias
          </h1>
          <p className="text-muted-foreground mt-0.5 !text-sm !leading-5">
            {loading
              ? "Revisa y administra las agencias registradas"
              : `${agencies.length} agencias registradas`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="!h-9 !text-sm pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, nombre comercial o correo..."
            type="search"
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
                <Label className="!text-sm !font-medium">Estado</Label>
                <Select
                  value={status || "all"}
                  onValueChange={(value) => {
                    setStatus(value === "all" ? "" : (value as AgencyStatus));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full !text-sm">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem
                        key={option.value || "all"}
                        value={option.value || "all"}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
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
                    <SelectItem value="DESC">Más nuevas primero</SelectItem>
                    <SelectItem value="ASC">Más antiguas primero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label className="!text-sm !font-medium">
                  Resultados por página
                </Label>
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
          <p className="text-destructive !text-sm">{error}</p>
          <Button
            onClick={() => void loadAgencies()}
            size="sm"
            type="button"
            variant="outline"
            className="!text-sm"
          >
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
                <Skeleton className="h-4 w-36" />
                <Skeleton className="ml-auto hidden h-4 w-28 sm:block" />
                <Skeleton className="hidden h-5 w-16 rounded-full md:block" />
              </div>
            ))}
          </div>
        ) : pageAgencies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="bg-muted flex size-14 items-center justify-center rounded-full">
              <UserX className="text-muted-foreground/30 size-7" />
            </div>
            <p className="!text-sm !font-medium">No se encontraron agencias</p>
            <p className="text-muted-foreground !text-xs">
              Prueba ajustando los filtros de búsqueda
            </p>
            {hasActiveFilters || search ? (
              <Button
                className="mt-1 !text-sm"
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
                  Agencia
                </TableHead>
                <TableHead className="text-muted-foreground hidden !py-3 !text-[11px] !font-semibold !tracking-wider uppercase md:table-cell">
                  Ubicación
                </TableHead>
                <TableHead className="text-muted-foreground hidden !py-3 !text-[11px] !font-semibold !tracking-wider uppercase lg:table-cell">
                  Tipo
                </TableHead>
                <TableHead className="text-muted-foreground !py-3 !text-[11px] !font-semibold !tracking-wider uppercase">
                  Estado
                </TableHead>
                <TableHead className="text-muted-foreground hidden !py-3 !text-[11px] !font-semibold !tracking-wider uppercase sm:table-cell">
                  Registro
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageAgencies.map((agency) => (
                <TableRow
                  key={agency.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="!py-3">
                    <div className="flex items-center gap-3">
                      <AgencyAvatar agency={agency} />
                      <div className="min-w-0">
                        <p className="truncate !text-sm !font-medium">
                          {agency.commercialName}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate !text-xs">
                          {agency.agencyName}
                        </p>
                        {agency.email ? (
                          <p className="text-muted-foreground mt-0.5 truncate !text-xs">
                            {agency.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden !py-3 md:table-cell">
                    <span className="text-muted-foreground !text-sm">
                      {[agency.city, agency.province]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden !py-3 lg:table-cell">
                    <span className="!text-sm">
                      {businessTypeLabel(agency.businessType)}
                    </span>
                  </TableCell>
                  <TableCell className="!py-3">
                    <StatusBadge status={agency.status} />
                  </TableCell>
                  <TableCell className="hidden !py-3 sm:table-cell">
                    <span className="text-muted-foreground !text-sm tabular-nums">
                      {formatDate(agency.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="!py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">
                            Acciones para {agency.commercialName}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 !text-sm">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/agencies/${agency.id}`}>
                            <Eye className="size-4" />
                            Ver detalle
                          </Link>
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

      {!loading && sortedAgencies.length > 0 ? (
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
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className={paginationBtnClass(currentPage < totalPages)}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
