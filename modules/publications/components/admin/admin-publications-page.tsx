"use client";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useMemo,
  useState,
} from "react";

import {

  Home,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import AdminPublicationsTable from "./admin-publications-table";

import {
  useAdminPublications,
} from "../../hooks/admin/useAdminPublications";

import type {
  AdminPublicationStatus,
} from "../../services/admin/admin-publication.service";

type StatusFilter =
  | AdminPublicationStatus
  | "";

const statusOptions: Array<{
  value: StatusFilter;
  label: string;
}> = [
  {
    value: "",
    label: "Todas",
  },
  {
    value: "PENDING",
    label: "Pendientes",
  },
  {
    value: "APPROVED",
    label: "Aprobadas",
  },
  {
    value: "REJECTED",
    label: "Rechazadas",
  },
  {
    value: "DRAFT",
    label: "Borradores",
  },
  {
    value: "INACTIVE",
    label: "Inactivas",
  },
];

export default function AdminPublicationsPage() {
  const { t } = usePreferences();
  const [
    status,
    setStatus,
  ] =
    useState<StatusFilter>(
      "",
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const filters =
    useMemo(
      () => ({
        status,
        search,
      }),
      [
        status,
        search,
      ],
    );

  const {
    publications,
    loading,
    error,
    loadPublications,
  } =
    useAdminPublications(
      filters,
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList className="!text-sm">
          <BreadcrumbItem><BreadcrumbLink href="/dashboard" className="flex items-center gap-1.5 !text-sm"><Home className="size-3.5" />{t("Inicio ")}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage className="!text-sm">{t("Publicaciones")}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-row items-start justify-between gap-4">
        <div>

        <h1 className="!m-0 !max-w-none lr-page-title">{t("Publicaciones ")}</h1>

        <p className="text-muted-foreground mt-0.5 !text-sm !leading-5">{t("Revisa y administra las publicaciones enviadas por las agencias. ")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Buscar por título o destino...")}
            aria-label={t("Buscar por título o destino...")}
            className="!h-9 !text-sm pl-9"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="shrink-0 gap-2 !text-sm">
              <SlidersHorizontal className="size-4" aria-hidden="true" />{t("Filtros")}
              {status ? <><span className="size-2 rounded-full bg-primary" aria-hidden="true" /><span className="sr-only">{t(statusOptions.find(option => option.value === status)?.label ?? "")}</span></> : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[320px] max-w-full flex-col gap-0 p-0 sm:w-[360px] sm:max-w-[360px]">
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle className="!m-0 !max-w-none !text-base !font-semibold !leading-6 !tracking-normal">{t("Filtros")}</SheetTitle>
              <SheetDescription className="sr-only">{t("Filtra las publicaciones por estado.")}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="publication-status-filter" className="!text-sm !font-medium">{t("Estado")}</Label>
                <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value as AdminPublicationStatus)}>
                  <SelectTrigger id="publication-status-filter" className="w-full !text-sm">
                    <SelectValue placeholder={t("Todos los estados")} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => <SelectItem key={option.value || "all"} value={option.value || "all"}>{t(option.value ? option.label : "Todos los estados")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button type="button" variant="ghost" className="w-full !text-sm text-muted-foreground" onClick={() => { setStatus(""); setSearch(""); }}>
                {t("Limpiar filtros")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {error && (
        <div role="alert" className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-destructive !text-sm">
            {t(error)}
          </p>

          <Button
            type="button"
            onClick={() =>
              void loadPublications()
            }
            size="sm" variant="outline" className="!text-sm"
          >{t("Reintentar ")}</Button>
        </div>
      )}

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      {loading ? (
        <LoadingState />
      ) : (
        <AdminPublicationsTable
          publications={
            publications
          }
        />
      )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
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
  );
}
