export type AdminPublicationStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "INACTIVE";

export type AdminPublicationServiceType =
  | "EXCURSION"
  | "TRANSPORT";

export interface AdminPublicationAgency {
  id: string;
  agencyName: string;
  commercialName: string;
  logoUrl: string | null;
  status: string;
}

export interface AdminPublicationLanguage {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

export interface AdminPublicationDeparture {
  id: string;
  publicationId: string;
  startAt: string;
  endAt: string | null;
  capacity: number;
  status:
    | "ACTIVE"
    | "CANCELLED"
    | "COMPLETED";
}

export interface AdminPublication {
  id: string;
  agencyId: string;

  serviceType:
    AdminPublicationServiceType | null;

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

  status: AdminPublicationStatus;

  createdAt: string;
  updatedAt: string;

  agency: AdminPublicationAgency | null;

  languages: AdminPublicationLanguage[];

  departures: AdminPublicationDeparture[];
}

interface ApiResponse<T> {
  data: T;
}

interface RawAgency {
  id: string;
  agency_name: string;
  commercial_name: string;
  logo_url: string | null;
  status: string;
}

interface RawLanguage {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

interface RawPublicationLanguage {
  language_id: number;

  languages:
    | RawLanguage
    | RawLanguage[]
    | null;
}

interface RawPublicationDeparture {
  id: string;
  publication_id: string;
  start_at: string;
  end_at: string | null;
  capacity: number;
  status:
    | "ACTIVE"
    | "CANCELLED"
    | "COMPLETED";
}

interface RawPublication {
  id: string;
  agency_id: string;

  service_type:
    AdminPublicationServiceType | null;

  title: string | null;
  description: string | null;
  destination: string | null;

  price_per_person: number | null;
  duration_minutes: number | null;

  included: string | null;
  not_included: string | null;
  meeting_point: string | null;

  main_image_url: string | null;

  default_capacity: number | null;

  status: AdminPublicationStatus;

  created_at: string;
  updated_at: string;

  agencies?:
    | RawAgency
    | RawAgency[]
    | null;

  publication_languages?:
    RawPublicationLanguage[];
}

interface RawPublicationDetail {
  publication: RawPublication;
  languages: RawPublicationLanguage[];
  departures: RawPublicationDeparture[];
}

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeAgency(
  value:
    | RawAgency
    | RawAgency[]
    | null
    | undefined,
): AdminPublicationAgency | null {
  const raw =
    firstRelation(value);

  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    agencyName:
      raw.agency_name,
    commercialName:
      raw.commercial_name,
    logoUrl:
      raw.logo_url,
    status:
      raw.status,
  };
}

function normalizeLanguages(
  relations:
    RawPublicationLanguage[] = [],
): AdminPublicationLanguage[] {
  return relations
    .map((relation) => {
      const raw =
        firstRelation(
          relation.languages,
        );

      if (!raw) {
        return null;
      }

      return {
        id: raw.id,
        name: raw.name,
        code: raw.code,
        active: raw.active,
      };
    })
    .filter(
      (
        value,
      ): value is AdminPublicationLanguage =>
        value !== null,
    );
}

function normalizeDepartures(
  values:
    RawPublicationDeparture[] = [],
): AdminPublicationDeparture[] {
  return values.map(
    (value) => ({
      id: value.id,

      publicationId:
        value.publication_id,

      startAt:
        value.start_at,

      endAt:
        value.end_at,

      capacity:
        value.capacity,

      status:
        value.status,
    }),
  );
}

function normalizePublication(
  raw: RawPublication,
  languages?:
    RawPublicationLanguage[],
  departures?:
    RawPublicationDeparture[],
): AdminPublication {
  return {
    id:
      raw.id,

    agencyId:
      raw.agency_id,

    serviceType:
      raw.service_type,

    title:
      raw.title,

    description:
      raw.description,

    destination:
      raw.destination,

    pricePerPerson:
      raw.price_per_person,

    durationMinutes:
      raw.duration_minutes,

    included:
      raw.included,

    notIncluded:
      raw.not_included,

    meetingPoint:
      raw.meeting_point,

    mainImageUrl:
      raw.main_image_url,

    defaultCapacity:
      raw.default_capacity,

    status:
      raw.status,

    createdAt:
      raw.created_at,

    updatedAt:
      raw.updated_at,

    agency:
      normalizeAgency(
        raw.agencies,
      ),

    languages:
      normalizeLanguages(
        languages ??
          raw.publication_languages ??
          [],
      ),

    departures:
      normalizeDepartures(
        departures ??
          [],
      ),
  };
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const body =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    const message =
      body?.message ??
      body?.error ??
      "No se pudo procesar la solicitud.";

    throw new Error(
      message,
    );
  }

  return body;
}

export interface AdminPublicationFilters {
  status?:
    | AdminPublicationStatus
    | "";

  search?: string;
}

export async function getAdminPublications(
  filters:
    AdminPublicationFilters = {},
): Promise<AdminPublication[]> {
  const params =
    new URLSearchParams();

  if (filters.status) {
    params.set(
      "status",
      filters.status,
    );
  }

  if (
    filters.search?.trim()
  ) {
    params.set(
      "search",
      filters.search.trim(),
    );
  }

  const query =
    params.toString();

  const response =
    await fetch(
      `/api/admin/publications${query ? `?${query}` : ""}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        RawPublication[]
      >
    >(response);

  return result.data.map(
    (publication) =>
      normalizePublication(
        publication,
      ),
  );
}

export async function getAdminPublication(
  publicationId: string,
): Promise<AdminPublication> {
  const response =
    await fetch(
      `/api/admin/publications/${encodeURIComponent(publicationId)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        RawPublicationDetail
      >
    >(response);

  return normalizePublication(
    result.data.publication,
    result.data.languages,
    result.data.departures,
  );
}

export async function reviewAdminPublication(
  publicationId: string,
  status:
    | "APPROVED"
    | "REJECTED",
): Promise<AdminPublicationStatus> {
  const response =
    await fetch(
      `/api/admin/publications/${encodeURIComponent(publicationId)}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify({
            status,
          }),
      },
    );

  const result =
    await parseResponse<
      ApiResponse<RawPublication>
    >(response);

  return result.data.status;
}