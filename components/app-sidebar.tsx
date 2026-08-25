import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { NavMain } from "./app-sidebar/nav-main";
import { NavUser } from "./app-sidebar/nav-user";
import { SidebarBrand } from "./app-sidebar/sidebar-brand";

type SessionUser = {
  username?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

type AppSidebarProps = {
  user?: SessionUser | null;
};

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>


      <SidebarContent className="gap-0">
        <NavMain role={user?.role} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
