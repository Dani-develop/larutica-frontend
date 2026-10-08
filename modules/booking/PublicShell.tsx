'use client';
import { usePreferences } from "@/lib/preferences/Preferences";
import { PreferenceControls } from "@/components/preferences/PreferenceControls";
import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { BrandMark } from '@/components/brand/BrandMark';
export function PublicShell({children, className, header}: {children: ReactNode; className?: string; header?: ReactNode}) {
  const { t } = usePreferences();
  const { user } = useAuth();
  const pathname = usePathname();
  return <div className={className ? `booking-site ${className}` : "booking-site"}><a className="booking-skip" href="#contenido">{t("Saltar al contenido")}</a>
    {header ?? <header className="booking-header"><Link href="/" className="booking-brand"><BrandMark className="size-10"/><span className="booking-wordmark">{t("LaRutica")}<small>{t("Costa Rica, a tu ritmo")}</small></span></Link>
      <nav aria-label={t("Navegación principal")}><Link href="/#experiencias" aria-current={pathname === '/' ? 'page' : undefined}>{t("Explorar")}</Link><Link href="/?viaje=reservas" aria-current={pathname === '/mis-reservas' ? 'page' : undefined}>{t("Mis reservas")}</Link><Link href={user ? '/dashboard' : '/login'}>{user ? t("Mi cuenta") : t("Iniciar sesión")}</Link></nav><PreferenceControls />
    </header>}{children}<footer className="booking-footer"><strong>{t("LaRutica")}</strong><p>{t("Excursiones y transporte para descubrir Costa Rica.")}</p><Link href="/#como-reservar">{t("Cómo reservar")}</Link></footer>
  </div>;
}
