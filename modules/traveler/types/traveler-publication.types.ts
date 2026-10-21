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
};