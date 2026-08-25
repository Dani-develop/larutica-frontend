import Link from "next/link";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SITE } from "@/modules/landing/constants/site";

export function SidebarBrand() {
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
            <div className="flex aspect-square size-9 items-center justify-center overflow-hidden rounded-[50%_50%_44%_56%] bg-[#0d684e] text-xs font-bold text-white">
              LR
            </div>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">{SITE.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                Panel administrativo
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
