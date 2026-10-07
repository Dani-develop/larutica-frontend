"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SITE } from "@/modules/landing/constants/site";

export function SidebarBrand() {
  const { t } = usePreferences();
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          tooltip={SITE.fullName}
          className="group-data-[collapsible=icon]:p-0!"
        >
          <Link
            href="/dashboard"
            onClick={() => {
              if (isMobile) {
                setOpenMobile(false);
              }
            }}
          >
            <BrandMark className="size-9" />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">{SITE.name}</span>
              <span className="text-muted-foreground truncate text-xs">{t("Panel administrativo ")}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
