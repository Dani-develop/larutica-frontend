import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RouteStatus } from "../models/Route";

const statusClass: Record<RouteStatus, string> = {
  Publicada: "border-transparent bg-primary/10 text-primary",
  Borrador: "border-transparent bg-muted text-muted-foreground",
  "En revisión": "border-transparent bg-amber-100 text-amber-900",
};

export function RouteStatusBadge({
  status,
  className,
}: {
  status: RouteStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(statusClass[status], className)}>
      {status}
    </Badge>
  );
}
