export type PublicationServiceType =
  | "EXCURSION"
  | "TRANSPORT";

export type PublicationStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "INACTIVE";

export type DepartureStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "COMPLETED";

export type PublicationLanguage = {
  id: number;
  name: string;
  code: string;
};

export type Publication = {
  id: string;

  agencyId: string;

  serviceType:
    | PublicationServiceType
    | null;

  title: string | null;

  description: string | null;

  destination: string | null;

  pricePerPerson: number | null;

  durationMinutes: number | null;

  included: string | null;

  notIncluded: string | null;

  meetingPoint: string | null;

  mainImageUrl: string | null;

  defaultCapacity: number | null;

  status: PublicationStatus;

  languageIds: number[];

  languages?: PublicationLanguage[];

  createdAt: string;

  updatedAt: string;
};

export type PublicationDeparture = {
  id: string;

  publicationId: string;

  startAt: string;

  endAt: string | null;

  capacity: number;

  status: DepartureStatus;

  createdAt: string;

  updatedAt: string;
};

export type CreatePublicationInput = {
  serviceType?: PublicationServiceType | "";

  title?: string;

  description?: string;

  destination?: string;

  pricePerPerson?: number | null;

  durationMinutes?: number | null;

  included?: string;

  notIncluded?: string;

  meetingPoint?: string;

  mainImageUrl?: string;

  defaultCapacity?: number | null;

  languageIds?: number[];

  action?: "DRAFT" | "SUBMIT";
};

export type UpdatePublicationInput =
  Partial<CreatePublicationInput>;

export type CreateDepartureInput = {
  startAt: string;

  endAt?: string | null;

  capacity?: number | null;
};

export type UpdateDepartureInput = {
  startAt?: string;

  endAt?: string | null;

  capacity?: number | null;

  status?: DepartureStatus;
};

export type PublicationApiResponse = {
  data: Publication;
};

export type PublicationsApiResponse = {
  data: Publication[];
};

export type PublicationDepartureApiResponse = {
  data: PublicationDeparture;
};

export type PublicationDeparturesApiResponse = {
  data: PublicationDeparture[];
};

export type DeletePublicationResponse = {
  data: {
    id: string;
    status: "INACTIVE";
  };
};

export type ApiErrorResponse = {
  error?: string;
};

export const emptyPublicationInput: CreatePublicationInput = {
  serviceType: "",
  title: "",
  description: "",
  destination: "",
  pricePerPerson: null,
  durationMinutes: null,
  included: "",
  notIncluded: "",
  meetingPoint: "",
  mainImageUrl: "",
  defaultCapacity: null,
  languageIds: [],
  action: "DRAFT",
};