"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useMemo,
  useState,
} from "react";

import {
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

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
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-5">
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Publicaciones" }]} />

        <h1 className="!m-0 lr-page-title">{t("Publicaciones ")}</h1>

        <p className="mt-1 text-[11px] leading-5 text-[#66706B]">{t("Revisa y administra las publicaciones enviadas por las agencias. ")}</p>
      </div>

      <div className="mb-6 flex items-center gap-3">
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
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[10px] text-red-700">
            {t(error)}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadPublications()
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-[10px] font-semibold text-red-700"
          >
            <RefreshCw
              size={12}
            />{t("Reintentar ")}</button>
        </div>
      )}

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
  );
}

function LoadingState() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
      {Array.from({
        length: 4,
      }).map(
        (
          _,
          index,
        ) => (
          <div
            key={
              index
            }
            className="flex items-center gap-4 border-b border-[#EEF1EF] px-4 py-4 last:border-b-0"
          >
            <div className="size-11 animate-pulse rounded-lg bg-[#EDF2EF]" />

            <div className="flex-1">
              <div className="h-3 w-40 animate-pulse rounded bg-[#E3E8E5]" />

              <div className="mt-2 h-2.5 w-56 animate-pulse rounded bg-[#EEF1EF]" />
            </div>

            <div className="h-7 w-20 animate-pulse rounded-full bg-[#EEF1EF]" />
          </div>
        ),
      )}
    </div>
  );
}