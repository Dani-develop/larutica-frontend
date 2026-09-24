"use client";

import {
  ChevronRight,
  ImageIcon,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import type {
  AdminPublication,
  AdminPublicationStatus,
} from "../../services/admin/admin-publication.service";

interface AdminPublicationsTableProps {
  publications:
    AdminPublication[];
}

export default function AdminPublicationsTable({
  publications,
}: AdminPublicationsTableProps) {
  const router =
    useRouter();

  if (
    publications.length ===
    0
  ) {
    return (
      <div className="rounded-xl border border-[#DDE2DF] bg-white px-6 py-10 text-center">
        <ImageIcon
          size={24}
          className="mx-auto text-[#87908C]"
        />

        <p className="mt-3 text-[12px] font-semibold text-[#252B28]">
          No hay publicaciones para mostrar
        </p>

        <p className="mt-1 text-[10px] text-[#66706B]">
          Cambia los filtros o espera nuevas publicaciones enviadas a revisión.
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
              <Header>
                Publicación
              </Header>

              <Header>
                Agencia
              </Header>

              <Header>
                Destino
              </Header>

              <Header>
                Precio
              </Header>

              <Header>
                Estado
              </Header>

              <Header
                align="right"
              >
                Acción
              </Header>
            </tr>
          </thead>

          <tbody>
            {publications.map(
              (
                publication,
              ) => (
                <tr
                  key={
                    publication.id
                  }
                  className="border-b border-[#EEF1EF] last:border-b-0 hover:bg-[#FAFCFB]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#EDF2EF]">
                        {publication.mainImageUrl ? (
                          <img
                            src={
                              publication.mainImageUrl
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon
                            size={17}
                            className="text-[#8A9690]"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-[#252B28]">
                          {publication.title ||
                            "Sin título"}
                        </p>

                        <p className="mt-0.5 text-[9px] text-[#7A837F]">
                          {serviceTypeLabel(
                            publication.serviceType,
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-[10px] font-medium text-[#252B28]">
                      {publication.agency?.commercialName ??
                        publication.agency?.agencyName ??
                        "Sin agencia"}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-[10px] text-[#66706B]">
                    {publication.destination ||
                      "—"}
                  </td>

                  <td className="px-4 py-3 text-[10px] font-medium text-[#252B28]">
                    {publication.pricePerPerson !==
                    null
                      ? `$${publication.pricePerPerson.toFixed(2)}`
                      : "—"}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        publication.status
                      }
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/publications/${publication.id}`,
                        )
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D7E1DC] bg-white px-3 text-[10px] font-semibold text-[#075E36] hover:bg-[#EFF8F3]"
                    >
                      Ver detalle
                      <ChevronRight
                        size={12}
                      />
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Header({
  children,
  align = "left",
}: {
  children:
    React.ReactNode;

  align?:
    | "left"
    | "right";
}) {
  return (
    <th
      className={[
        "px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#69726D]",
        align ===
        "right"
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
  status:
    AdminPublicationStatus;
}) {
  const styles: Record<
    AdminPublicationStatus,
    string
  > = {
    DRAFT:
      "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",

    PENDING:
      "border-[#F1D49A] bg-[#FFF8E8] text-[#886617]",

    APPROVED:
      "border-[#CBE5D4] bg-[#EAF6EE] text-[#075E36]",

    REJECTED:
      "border-[#F2CACA] bg-[#FFF0F0] text-[#A63737]",

    INACTIVE:
      "border-[#DDE2DF] bg-[#F1F2F1] text-[#727A76]",
  };

  const labels: Record<
    AdminPublicationStatus,
    string
  > = {
    DRAFT:
      "Borrador",

    PENDING:
      "En revisión",

    APPROVED:
      "Aprobada",

    REJECTED:
      "Rechazada",

    INACTIVE:
      "Inactiva",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function serviceTypeLabel(
  value:
    AdminPublication["serviceType"],
) {
  switch (value) {
    case "EXCURSION":
      return "Excursión";

    case "TRANSPORT":
      return "Transporte";

    default:
      return "Sin tipo";
  }
}