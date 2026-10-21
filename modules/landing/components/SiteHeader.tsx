"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PreferenceControls } from "@/components/preferences/PreferenceControls";
import { usePreferences } from "@/lib/preferences/Preferences";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { tripPath, type TripMenuId } from "../lib/travelerRoutes";
import { AccessDialog, HelpDialog } from "./SiteDialogs";
import { TripMenu } from "./TripMenu";
import "./site-header.css";

function hasRootClass(name: string) {
  return typeof document !== "undefined" && document.documentElement.classList.contains(name);
}

// Pages without their own navigation state (e.g. experience detail) omit the handlers and get route-based defaults.
export function SiteHeader({ exploreActive = false, exploreCurrent = false, tripMenuActive = null, onBrand, onExplore, onDestinations, onTripSelect, onHelp, onAccess }: {
  exploreActive?: boolean;
  exploreCurrent?: boolean;
  tripMenuActive?: TripMenuId | null;
  onBrand?: () => void;
  onExplore?: () => void;
  onDestinations?: () => void;
  onTripSelect?: (id: TripMenuId) => void;
  onHelp?: () => void;
  onAccess?: () => void;
}) {
  const { t } = usePreferences();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [largeText, setLargeText] = useState(() => hasRootClass("large-text"));
  const [highContrast, setHighContrast] = useState(() => hasRootClass("high-contrast"));

  const goHome = onBrand ?? (() => router.push("/"));
  const explore = onExplore ?? (() => router.push("/"));
  const destinations = onDestinations ?? (() => router.push("/#destinos"));
  const selectTrip = onTripSelect ?? ((id: TripMenuId) => router.push(tripPath(id)));
  const openHelp = onHelp ?? (() => setHelpOpen(true));
  const openAccess = onAccess ?? (() => setAccessOpen(true));

  async function logout() {
    setSigningOut(true); setLogoutError("");
    try { await signOut(); router.replace("/"); }
    catch { setLogoutError("No pudimos confirmar el cierre de sesión. Intenta de nuevo."); }
    finally { setSigningOut(false); }
  }

  return (
    <>
      <header className="site-header discovery-header">
        <button className="brand brand-button" type="button" onClick={goHome} aria-label={t("LaRutica, volver al inicio")}>
          <span className="brand-mark" aria-hidden="true" /><span>{t("LaRutica")}</span>
        </button>
        <nav aria-label={t("Navegación principal")}>
          <button className={exploreActive ? "nav-active" : ""} onClick={explore} aria-current={exploreCurrent ? "page" : undefined}>{t("Explorar")}</button>
          <button onClick={destinations}>{t("Destinos")}</button>
          {!authLoading && user?.role === "Viajero" ? <TripMenu active={tripMenuActive} onSelect={selectTrip} /> : null}
          <button onClick={openHelp}>{t("Ayuda")}</button>
        </nav>
        <div className="header-actions">
          <PreferenceControls />
          <Button variant="ghost" className="access-button" type="button" onClick={openAccess}>{t("Accesibilidad")}</Button>
          {authLoading ? <span role="status">{t("Cargando cuenta…")}</span> : user ? <>
            <Button asChild><Link href={user.role === "Viajero" ? tripPath("perfil") : "/dashboard"}>{t("Mi cuenta")}</Link></Button>
            <button className="button button-quiet account-logout" type="button" disabled={signingOut} onClick={logout}>{signingOut ? t("Cerrando sesión…") : t("Cerrar sesión")}</button>
          </> : <Button asChild><Link href="/login">{t("Ingresar")}</Link></Button>}
        </div>
      </header>
      {logoutError && <p className="notice" role="alert">{t(logoutError)}</p>}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {accessOpen && <AccessDialog
        largeText={largeText}
        setLargeText={value => { setLargeText(value); document.documentElement.classList.toggle("large-text", value); }}
        highContrast={highContrast}
        setHighContrast={value => { setHighContrast(value); document.documentElement.classList.toggle("high-contrast", value); }}
        onClose={() => setAccessOpen(false)}
      />}
    </>
  );
}
