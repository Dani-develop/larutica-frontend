"use client";

import {
  Building2,
  ChevronRight,
  MapPin,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import type {
  Agency,
  AgencyStatus,
} from "../../types/agency.types";

interface AdminAgenciesTableProps {
  agencies: Agency[];
}

export default function AdminAgenciesTable({
  agencies,
}: AdminAgenciesTableProps) {
  const router = useRouter();

  if (agencies.length === 0) {
    return (
      <div className="rounded-xl border border-[#DDE2DF] bg-white px-6 py-10 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-[#EAF5ED] text-[#075E36]">
          <Building2 size={20} />
        </div>

        <p className="mt-3 text-[12px] font-semibold text-[#252B28]">
          No hay agencias para mostrar
        </p>

        <p className="mt-1 text-[10px] text-[#66706B]">
          Intenta cambiar los filtros de búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE2DF] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#F6F8F7]">
            <tr className="border-b border-[#E2E6E4]">
              <TableHeader>
                Agencia
              </TableHeader>

              <TableHeader>
                Ubicación
              </TableHeader>

              <TableHeader>
                Tipo
              </TableHeader>

              <TableHeader>
                Estado
              </TableHeader>

              <TableHeader>
                Registro
              </TableHeader>

              <TableHeader align="right">
                Acción
              </TableHeader>
            </tr>
          </thead>

          <tbody>
            {agencies.map((agency) => (
              <tr
                key={agency.id}
                className="border-b border-[#EEF1EF] transition last:border-b-0 hover:bg-[#FAFCFB]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#EAF5ED] text-[#075E36]">
                      {agency.logoUrl ? (
                        <img
                          src={agency.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 size={16} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-[#252B28]">
                        {agency.commercialName}
                      </p>

                      <p className="mt-0.5 truncate text-[9px] text-[#7A837F]">
                        {agency.agencyName}
                      </p>

                      {agency.email && (
                        <p className="mt-0.5 truncate text-[9px] text-[#87908C]">
                          {agency.email}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#59615D]">
                    <MapPin
                      size={12}
                      className="shrink-0 text-[#075E36]"
                    />

                    <span className="max-w-[180px] truncate">
                      {[
                        agency.city,
                        agency.province,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Sin ubicación"}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-[10px] text-[#59615D]">
                  {businessTypeLabel(
                    agency.businessType,
                  )}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge
                    status={agency.status}
                  />
                </td>

                <td className="px-4 py-3 text-[10px] text-[#66706B]">
                  {formatDate(
                    agency.createdAt,
                  )}
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/agencies/${agency.id}`,
                      )
                    }
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#D7E1DC] bg-white px-3 text-[10px] font-semibold text-[#075E36] transition hover:border-[#0A6A42] hover:bg-[#EFF8F3]"
                  >
                    Ver detalle

                    <ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#69726D]",
        align === "right"
          ? "text-right"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function StatusBadge({
  status,
}: {
  status: AgencyStatus;
}) {
  const config: Record<
    AgencyStatus,
    {
      label: string;
      className: string;
    }
  > = {
    DRAFT: {
      label: "Borrador",
      className:
        "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",
    },

    PENDING: {
      label: "Pendiente",
      className:
        "border-[#F1D49A] bg-[#FFF8E8] text-[#886617]",
    },

    APPROVED: {
      label: "Aprobada",
      className:
        "border-[#CBE5D4] bg-[#EAF6EE] text-[#075E36]",
    },

    REJECTED: {
      label: "Rechazada",
      className:
        "border-[#F2CACA] bg-[#FFF0F0] text-[#A63737]",
    },

    INACTIVE: {
      label: "Inactiva",
      className:
        "border-[#DDE2DF] bg-[#F1F2F1] text-[#727A76]",
    },
  };

  const current = config[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

function businessTypeLabel(
  value: Agency["businessType"],
) {
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

function formatDate(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-CR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}