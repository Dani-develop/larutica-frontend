import type { Journey } from "@/modules/journeys/types";
export type TravelerPublication = {
  id: string;

  title: string;

  description: string;

  destination: string;

  mainImageUrl: string | null;

  pricePerPerson: number;

  durationMinutes: number;

  included: string;

  notIncluded: string;

  journey?: Journey | null;
  meetingPoint: string;

  defaultCapacity: number;

  languages: string[];

  serviceType:
    | "EXCURSION"
    | "TRANSPORT";

  departures?: { id: string; startAt: string; available: number }[];

  providerName?: string;

  providerSlug?: string;

  promoted?: boolean;

  /** Promedio de calificaciones de viajeros (1 a 5); null si aún no hay. */
  ratingAverage?: number | null;

  ratingCount?: number;

  /** Reservas confirmadas o finalizadas; sirve para ordenar por "Más reservados". */
  bookingCount?: number;
};