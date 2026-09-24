"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Building2,
  RefreshCw,
  Search,
} from "lucide-react";

import AdminAgenciesTable from "@/modules/agency/components/admin/admin-agencies-table";

import {
  useAdminAgencies,
} from "@/modules/agency/hooks/admin/useAdminAgencies";

import type {
  AgencyStatus,
} from "@/modules/agency/types/agency.types";

type StatusFilter =
  | AgencyStatus
  | "";

const statusOptions: Array<{
  value: StatusFilter;
  label: string;
}> = [
  {
    value: "",
    label: "Todos",
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

export default function AdminAgenciesPage() {
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
    agencies,
    loading,
    error,
    loadAgencies,
  } =
    useAdminAgencies(
      filters,
    );

  const pendingCount =
    agencies.filter(
      (agency) =>
        agency.status ===
        "PENDING",
    ).length;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-5">
        <p className="mb-1 text-[10px] font-medium text-[#075E36]">
          Dashboard / Agencias
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="!m-0 !max-w-none !text-[30px] !font-bold !leading-9 !tracking-[-0.025em] text-[#123A30]">
              Agencias
            </h1>

            <p className="mt-1 text-[11px] leading-5 text-[#66706B]">
              Revisa, aprueba y administra las agencias registradas en LaRutica.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-[#D7E7D9] bg-[#F7FBF8] px-3 py-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-[#EAF5ED] text-[#075E36]">
              <Building2 size={14} />
            </div>

            <div>
              <p className="text-[9px] text-[#66706B]">
                Pendientes
              </p>

              <p className="text-[13px] font-bold text-[#123A30]">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-3 rounded-xl border border-[#DDE2DF] bg-white p-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87908C]"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por nombre, nombre comercial o correo..."
              className="h-9 w-full rounded-lg border border-[#DDE2DF] bg-white pl-9 pr-3 text-[11px] text-[#252B28] outline-none transition placeholder:text-[#9AA19D] focus:border-[#08643B] focus:ring-2 focus:ring-[#08643B]/10"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map(
              (option) => {
                const active =
                  status ===
                  option.value;

                return (
                  <button
                    key={
                      option.value ||
                      "all"
                    }
                    type="button"
                    onClick={() =>
                      setStatus(
                        option.value,
                      )
                    }
                    className={[
                      "h-8 rounded-lg border px-3 text-[10px] font-semibold transition",
                      active
                        ? "border-[#0A6A42] bg-[#EFF8F3] text-[#075E36]"
                        : "border-[#DDE2DF] bg-white text-[#66706B] hover:border-[#A8BDB2]",
                    ].join(
                      " ",
                    )}
                  >
                    {option.label}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[10px] text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadAgencies()
            }
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-[10px] font-semibold text-red-700"
          >
            <RefreshCw size={12} />
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <LoadingTable />
      ) : (
        <AdminAgenciesTable
          agencies={agencies}
        />
      )}
    </div>
  );
}

function LoadingTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
      <div className="border-b border-[#E2E6E4] bg-[#F6F8F7] px-4 py-3">
        <div className="h-3 w-64 animate-pulse rounded bg-[#E0E5E2]" />
      </div>

      {Array.from({
        length: 5,
      }).map(
        (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-[#EEF1EF] px-4 py-4 last:border-b-0"
          >
            <div className="size-9 shrink-0 animate-pulse rounded-lg bg-[#EAF0EC]" />

            <div className="flex-1">
              <div className="h-3 w-36 animate-pulse rounded bg-[#E3E8E5]" />

              <div className="mt-2 h-2.5 w-52 animate-pulse rounded bg-[#EEF1EF]" />
            </div>

            <div className="h-7 w-20 animate-pulse rounded-full bg-[#EEF1EF]" />
          </div>
        ),
      )}
    </div>
  );
}