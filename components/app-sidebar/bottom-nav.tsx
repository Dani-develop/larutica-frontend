"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import Link from "next/link";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";

import { navGroups, type NavItem } from "./navigation";

function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isVisibleForRole(item: NavItem, role?: string | null) {
  return !item.roles || (role != null && item.roles.includes(role));
}

type Props = {
  role?: string | null;
};

export function BottomNav({ role }: Props) {
  const { t } = usePreferences();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();

  // Solo celular: el CSS global `nav { display:flex }` pisa `md:hidden`.
  if (!isMobile) return null;

  const allPrimary = navGroups
    .flatMap((group) => group.items)
    .filter((item) => item.primary && isVisibleForRole(item, role));

  const profileItem = allPrimary.find((item) => item.href === "/dashboard/profile");
  const otherItems = allPrimary.filter((item) => item.href !== "/dashboard/profile");

  const primaryItems = [
    ...otherItems.slice(0, profileItem ? 3 : 4),
    ...(profileItem ? [profileItem] : []),
  ];

  return (
    <div
      data-slot="bottom-nav"
      role="navigation"
      aria-label={t("Navegación principal")}
      className="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch justify-around border-t backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item, pathname);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon
              className={cn("size-5 shrink-0", active && "stroke-[2.25px]")}
              aria-hidden="true"
            />
            <span className="max-w-full truncate">{t(item.label)}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => setOpenMobile(!openMobile)}
        aria-expanded={openMobile}
        aria-label={t("Más opciones")}
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-none bg-transparent px-1 py-0 text-[10px] font-medium transition-colors",
          openMobile ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Menu
          className={cn("size-5 shrink-0", openMobile && "stroke-[2.25px]")}
          aria-hidden="true"
        />
        <span className="truncate">{t("Más")}</span>
      </button>
    </div>
  );
}
