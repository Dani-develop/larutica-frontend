import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  PublicationStatus,
} from "../types/publication.types";

const statusConfig: Record<
  PublicationStatus,
  {
    label: string;
    className: string;
  }
> = {
  DRAFT: {
    label: "Borrador",
    className:
      "border-transparent bg-slate-100 text-slate-700",
  },

  PENDING: {
    label: "En revisión",
    className:
      "border-transparent bg-amber-100 text-amber-800",
  },

  APPROVED: {
    label: "Aprobada",
    className:
      "border-transparent bg-emerald-100 text-emerald-800",
  },

  REJECTED: {
    label: "Rechazada",
    className:
      "border-transparent bg-red-100 text-red-700",
  },

  INACTIVE: {
    label: "Inactiva",
    className:
      "border-transparent bg-zinc-100 text-zinc-600",
  },
};

export function PublicationStatusBadge({
  status,
  className,
}: {
  status: PublicationStatus;
  className?: string;
}) {
  const config =
    statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}