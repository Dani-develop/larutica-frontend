"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import Link from "next/link";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { navGroups, type NavItem } from "./navigation";

function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type Props = {
  role?: string | null;
};

export function NavMain({ role }: Props) {
  const { t } = usePreferences();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const visibleGroups = role === "Viajero"
    ? navGroups.filter((group) =>
        group.label === "General" ||
        group.label === "Mi viaje" ||
        group.label === "Cuenta",
      )
    : navGroups;

  return (
    <>
      {visibleGroups.map((group) => {
        const visibleItems = group.items.filter(
          (item) => !item.roles || (role != null && item.roles.includes(role)),
        );
        if (visibleItems.length === 0) return null;
        const defaultOpen = group.defaultOpen ?? true;

        return (
          <Collapsible
            key={group.label}
            asChild
            defaultOpen={defaultOpen}
            className="group/collapsible"
          >
            <SidebarGroup className="py-1">
              <SidebarGroupLabel
                asChild
                className="group/label h-6 cursor-pointer hover:text-sidebar-foreground"
              >
                <CollapsibleTrigger>
                  {t(group.label)}
                  <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item, pathname);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={t(item.label)}
                          >
                            <Link
                              href={item.href}
                              onClick={() => {
                                if (isMobile) {
                                  setOpenMobile(false);
                                }
                              }}
                            >
                              <Icon className="size-4" />
                              <span>{t(item.label)}</span>
                            </Link>
                          </SidebarMenuButton>
                          {item.badge !== undefined && (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </>
  );
}
