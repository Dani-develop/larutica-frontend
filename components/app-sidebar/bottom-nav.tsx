"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

import { navGroups, type NavItem } from "./navigation";

function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type Props = {
  role?: string | null;
};

export function BottomNav({ role }: Props) {
  const pathname = usePathname();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  if (!isMobile) return null;

  const visibleItems = navGroups
    .flatMap((group) => group.items)
    .filter((item) => !item.roles || (role != null && item.roles.includes(role)));

  const primaryItems = visibleItems.filter((item) => item.primary).slice(0, 4);

  return (
    <nav
      data-slot="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px]",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => setOpenMobile(!openMobile)}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px]",
          openMobile ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Menu className="size-5" />
        <span className="truncate">Más</span>
      </button>
    </nav>
  );
}
