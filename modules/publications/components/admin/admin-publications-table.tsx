"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  Eye,
  MoreHorizontal,
  ImageIcon,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const { t } = usePreferences();
  const router =
    useRouter();

  if (
    publications.length ===
    0
  ) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-full"><ImageIcon className="text-muted-foreground/30 size-7" /></div>

        <p className="!text-sm !font-medium">{t("No hay publicaciones para mostrar ")}</p>

        <p className="text-muted-foreground !text-xs">{t("Cambia los filtros o espera nuevas publicaciones enviadas a revisión. ")}</p>
      </div>
    );
  }

  return (
        <Table className="min-w-[640px] table-fixed">
          <colgroup>
            <col />
            <col className="w-[22%]" />
            <col className="w-[20%]" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-24" />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <Header>{t("Publicación ")}</Header>

              <Header>{t("Agencia ")}</Header>

              <Header>{t("Destino ")}</Header>

              <Header>{t("Precio ")}</Header>

              <Header>{t("Estado ")}</Header>

              <Header
                align="right"
              >{t("Acción ")}</Header>
            </TableRow>
          </TableHeader>

          <TableBody>
            {publications.map(
              (
                publication,
              ) => (
                <TableRow
                  key={
                    publication.id
                  }
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="!py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
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
                            size={16}
                            className="text-primary"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate !text-sm !font-medium" title={publication.title || "Sin título"}>
                          {publication.title ||
                            "Sin título"}
                        </p>

                        <p className="text-muted-foreground mt-0.5 truncate !text-xs">
                          {serviceTypeLabel(
                            publication.serviceType,
                          )}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="!py-3">
                    <p
                      className="truncate !text-sm !font-medium"
                      title={publication.agency?.commercialName ?? publication.agency?.agencyName ?? "Sin agencia"}
                    >
                      {publication.agency?.commercialName ??
                        publication.agency?.agencyName ??
                        "Sin agencia"}
                    </p>
                  </TableCell>

                  <TableCell className="!py-3 text-muted-foreground !text-sm whitespace-normal">
                    <span className="line-clamp-2 max-w-full whitespace-normal break-normal">
                      {publication.destination ||
                        "—"}
                    </span>
                  </TableCell>

                  <TableCell className="!py-3 !text-sm !font-medium whitespace-nowrap">
                    {publication.pricePerPerson !==
                    null
                      ? `$${publication.pricePerPerson.toFixed(2)}`
                      : "—"}
                  </TableCell>

                  <TableCell className="!py-3">
                    <StatusBadge
                      status={
                        publication.status
                      }
                    />
                  </TableCell>

                  <TableCell className="!py-3 text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">{t("Acción ")}{publication.title || "Sin título"}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 !text-sm">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/publications/${publication.id}`)}>
                          <Eye className="size-4" />{t("Ver detalle ")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
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
    <TableHead
      className={[
        "text-muted-foreground !py-3 !text-[11px] !font-semibold !tracking-wider uppercase",
        align ===
        "right"
          ? "w-24 text-left"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </TableHead>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AdminPublicationStatus;
}) {
  const { t } = usePreferences();
  const styles: Record<
    AdminPublicationStatus,
    string
  > = {
    DRAFT:
      "bg-slate-100 text-slate-700 border-slate-200",

    PENDING:
      "bg-amber-100 text-amber-800 border-amber-200",

    APPROVED:
      "bg-emerald-100 text-emerald-700 border-emerald-200",

    REJECTED:
      "bg-red-100 text-red-700 border-red-200",

    INACTIVE:
      "bg-slate-100 text-slate-600 border-slate-200",
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium ${styles[status]}`}
    >
      {t(labels[status])}
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
