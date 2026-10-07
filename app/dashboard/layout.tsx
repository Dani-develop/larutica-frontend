"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import { PreferenceControls } from "@/components/preferences/PreferenceControls";

import dynamic from "next/dynamic";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, LogOut } from "lucide-react";
import { SITE } from "@/modules/landing/constants/site";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/app-sidebar/nav-user";
import { getInitials } from "@/components/app-sidebar/user-avatar-utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DashboardRoleProvider,
  useDashboardRole,
} from "@/components/dashboard/dashboard-role-context";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { travelerDashboardTarget } from "@/modules/landing/lib/travelerRoutes";
import { useEffect } from "react";

const AppSidebar = dynamic(
  () => import("@/components/app-sidebar").then((mod) => mod.AppSidebar),
  { loading: () => <Skeleton className="hidden w-64 shrink-0 rounded-none md:block" /> },
);

const BottomNav = dynamic(() =>
  import("@/components/app-sidebar/bottom-nav").then((mod) => mod.BottomNav),
);

interface HeaderUser {
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

function DashboardHeader({ user }: { user: HeaderUser }) {
  const { t } = usePreferences();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { signOut } = useAuth();
  const initials = getInitials(user?.username, user?.email);

  return (
    <header className="sticky top-0 z-50 flex h-15 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
      <div className="flex min-w-0 items-center gap-3">
        {!isMobile && <SidebarTrigger />}

        {isMobile && (
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <BrandMark className="size-8" />
            <span className="truncate text-sm font-semibold">{SITE.name}</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <PreferenceControls languageOnly />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2"
        >{t("Ver sitio web ")}<ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center rounded-lg focus-visible:outline-hidden"
              >
                <UserAvatar
                  initials={initials}
                  className="size-8 cursor-pointer border transition-opacity hover:opacity-80"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-1 w-56 rounded-lg" showHeader={false}>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <UserAvatar initials={initials} className="size-8" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.username ?? "Invitado"}
                    </span>
                    {user?.email && (
                      <span className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => {
                void signOut().then(() => router.replace("/login"));
              }}>
                <LogOut className="mr-2 size-4" />{t("Cerrar sesión ")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { role } = useDashboardRole();
  const { user: profile } = useAuth();
  const user = {
    username: profile?.name ?? "",
    email: profile?.email ?? "",
    role,
    avatarUrl: null as string | null,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="flex flex-col overflow-auto">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
        <BottomNav role={user.role} />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = usePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, user, loading, error, signOut } = useAuth();
  const search = searchParams.toString();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
    if (!loading && session && user?.status === "Inactivo") {
      void signOut().then(() => router.replace("/login?reason=inactive"));
    }
    if (!loading && session && user?.role === "Viajero" && user.status !== "Inactivo") {
      router.replace(travelerDashboardTarget(pathname, search));
    }
  }, [loading, pathname, router, search, session, signOut, user?.role, user?.status]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">{t("Validando sesión...")}</div>;
  }
  if (!session) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">{t("Redirigiendo al inicio de sesión...")}</div>;
  }
  if (user?.status === "Inactivo") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">{t("Cerrando una cuenta inactiva...")}</div>;
  }
  if (error || !user) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-destructive">{error ?? "No se encontró el perfil asociado a esta sesión."}</div>;
  }
  if (user.role === "Viajero") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">{t("Abriendo tu viaje...")}</div>;
  }

  return (
    <DashboardRoleProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardRoleProvider>
  );
}
