import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserStatus } from "../models/User";

const statusClass: Record<UserStatus, string> = {
  Activo: "border-transparent bg-primary/10 text-primary",
  Inactivo: "border-transparent bg-muted text-muted-foreground",
};

export function UserStatusBadge({
  status,
  className,
}: {
  status: UserStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(statusClass[status], className)}>
      {status}
    </Badge>
  );
}
