import type { Journey } from "@/modules/journeys/types";
export type Departure = { id: string; startAt: string; available: number };
export type Experience = {
  id: string; title: string; description: string; destination: string;
  serviceType: string; price: number; duration: number; image: string;
  included: string; notIncluded: string; meetingPoint: string;
  journey?: Journey | null;
  agency: string; departures: Departure[];
  promoted: boolean;
};
export const money = (n: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 2 }).format(n);
export const dateLabel = (s: string) => new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(s));
export const statusLabel = { PENDING: 'Pendiente de confirmación', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', PAST: 'Finalizada' };
