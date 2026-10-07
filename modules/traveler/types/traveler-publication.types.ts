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

  meetingPoint: string;

  defaultCapacity: number;

  languages: string[];

  serviceType:
    | "EXCURSION"
    | "TRANSPORT";

  providerName?: string;

  providerSlug?: string;
};