"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getInitials } from "./user-avatar-utils";

type SessionUser = {
  username?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

type NavUserProps = {
  user?: SessionUser | null;
};

export function UserAvatar({
  initials,
  className,
}: {
  avatarUrl?: string | null;
  initials: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-sidebar-accent text-sidebar-accent-foreground flex aspect-square items-center justify-center rounded-lg text-xs font-semibold",
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();

  const displayName = user?.username ?? "Invitado";
  const displayEmail = user?.email ?? "";
  const initials = getInitials(user?.username, user?.email);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar initials={initials} className="size-8" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {displayEmail && (
                  <span className="text-muted-foreground truncate text-xs">
                    {displayEmail}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-60" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            showHeader={false}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <UserAvatar initials={initials} className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {displayEmail && (
                    <span className="text-muted-foreground truncate text-xs">
                      {displayEmail}
                    </span>
                  )}
                  {user?.role && (
                    <span className="text-muted-foreground truncate text-[11px] uppercase tracking-wide">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => router.push("/")}>
              <LogOut className="mr-2 size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
