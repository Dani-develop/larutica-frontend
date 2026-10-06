'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { BrandMark } from '@/components/brand/BrandMark';
export function PublicShell({children}: {children: ReactNode}) {
  const { user } = useAuth();
  const pathname = usePathname();
  return <div className="booking-site"><a className="booking-skip" href="#contenido">Saltar al contenido</a>
    <header className="booking-header"><a href="/" className="booking-brand"><BrandMark className="size-10"/><span className="booking-wordmark">LaRutica<small>Costa Rica, a tu ritmo</small></span></a>
      <nav aria-label="Navegación principal"><a href="/#experiencias" aria-current={pathname === '/' ? 'page' : undefined}>Explorar</a><a href="/mis-reservas" aria-current={pathname === '/mis-reservas' ? 'page' : undefined}>Mis reservas</a><a href={user ? '/dashboard' : '/login'}>{user ? 'Mi cuenta' : 'Iniciar sesión'}</a></nav>
    </header>{children}<footer className="booking-footer"><strong>LaRutica</strong><p>Excursiones y transporte para descubrir Costa Rica.</p><a href="/#como-reservar">Cómo reservar</a></footer>
  </div>;
}
