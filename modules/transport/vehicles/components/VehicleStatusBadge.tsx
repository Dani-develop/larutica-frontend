import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleStatus } from "../models/Vehicle";

const statusClass: Record<VehicleStatus, string> = {
  Disponible: "border-transparent bg-primary/10 text-primary",
  "En mantenimiento": "border-transparent bg-amber-100 text-amber-900",
};

export function VehicleStatusBadge({
  status,
  className,
}: {
  status: VehicleStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(statusClass[status], className)}>
      {status}
    </Badge>
  );
}
