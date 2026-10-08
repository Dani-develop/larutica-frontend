'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Keep old reservation links working, with a single traveler screen.
export default function Page() {
  const router = useRouter();
  const params = useSearchParams();
  const reservation = params.get('reserva');
  const existing = params.get('existente');
  useEffect(() => {
    const target = new URLSearchParams({ viaje: 'reservas' });
    if (reservation) target.set('reserva', reservation);
    if (existing === '1') target.set('existente', '1');
    router.replace(`/?${target}`);
  }, [router, reservation, existing]);
  return null;
}
