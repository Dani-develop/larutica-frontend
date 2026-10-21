import { redirect } from 'next/navigation';

type ReservationSearchParams = {
  reserva?: string | string[];
  existente?: string | string[];
};

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

// Keep old reservation links working, with a single traveler screen.
export default async function Page({ searchParams }: { searchParams: Promise<ReservationSearchParams> }) {
  const params = await searchParams;
  const reservation = first(params.reserva);
  const existing = first(params.existente);
  const target = new URLSearchParams({ viaje: 'reservas' });
  if (reservation) target.set('reserva', reservation);
  if (existing === '1') target.set('existente', '1');
  redirect(`/?${target}`);
}
