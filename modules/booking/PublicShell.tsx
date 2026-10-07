'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { BrandMark } from '@/components/brand/BrandMark';
export function PublicShell({children}: {children: ReactNode}) {
  const { user } = useAuth();
  const pathname = usePathname();
  return <div className="booking-site"><a className="booking-skip" href="#contenido">Saltar al contenido</a>
    <header className="booking-header"><Link href="/" className="booking-brand"><BrandMark className="size-10"/><span className="booking-wordmark">LaRutica<small>Costa Rica, a tu ritmo</small></span></Link>
      <nav aria-label="Navegación principal"><Link href="/#experiencias" aria-current={pathname === '/' ? 'page' : undefined}>Explorar</Link><Link href="/mis-reservas" aria-current={pathname === '/mis-reservas' ? 'page' : undefined}>Mis reservas</Link><Link href={user ? '/dashboard' : '/login'}>{user ? 'Mi cuenta' : 'Iniciar sesión'}</Link></nav>
    </header>{children}<footer className="booking-footer"><strong>LaRutica</strong><p>Excursiones y transporte para descubrir Costa Rica.</p><Link href="/#como-reservar">Cómo reservar</Link></footer>
  </div>;
}
