import { Badge } from "@/components/ui/badge";
import type { PublicationStatus } from "../models/Publication";
import { cn } from "@/lib/utils";

const statusClass: Record<PublicationStatus, string> = {
  Publicada: "border-transparent bg-primary/10 text-primary",
  Borrador: "border-transparent bg-muted text-muted-foreground",
  "En revisión": "border-transparent bg-amber-100 text-amber-900",
};

export function PublicationStatusBadge({
  status,
  className,
}: {
  status: PublicationStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(statusClass[status], className)}>
      {status}
    </Badge>
  );
}
