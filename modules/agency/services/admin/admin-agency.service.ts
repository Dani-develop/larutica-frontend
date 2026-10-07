import { apiFetch } from "@/lib/api/browser-fetch";
import type {
  Agency,
  AgencyStatus,
  Language,
  ServiceCategory,
} from "../../types/agency.types";

interface ApiResponse<T> {
  data: T;
}

interface RawServiceCategory {
  id: number;
  name: string;
  active: boolean;
}

interface RawLanguage {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

interface RawAgencyCategory {
  category_id: number;

  service_categories:
    | RawServiceCategory
    | RawServiceCategory[]
    | null;
}

interface RawAgencyLanguage {
  language_id: number;

  languages:
    | RawLanguage
    | RawLanguage[]
    | null;
}

interface RawAgency {
  id: string;

  owner_user_id:
    string;

  agency_name:
    string;

  commercial_name:
    string;

  business_type:
    Agency["businessType"];

  description:
    string | null;

  email:
    string | null;

  phone:
    string | null;

  website:
    string | null;

  country:
    string | null;

  province:
    string | null;

  city:
    string | null;

  exact_address:
    string | null;

  logo_url:
    string | null;

  cover_url:
    string | null;

  verification_document_url:
    string | null;

  instagram_url:
    string | null;

  facebook_url:
    string | null;

  whatsapp:
    string | null;

  status:
    AgencyStatus;

  accepted_terms:
    boolean;

  terms_accepted_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;

  agency_service_categories?:
    RawAgencyCategory[];

  agency_languages?:
    RawAgencyLanguage[];
}

interface RawAgencyDetail {
  agency:
    RawAgency;

  categories:
    RawAgencyCategory[];

  languages:
    RawAgencyLanguage[];
}

interface VerificationDocumentResponse {
  url: string;
  expiresIn: number;
}

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}

function normalizeCategory(
  value:
    RawAgencyCategory,
): ServiceCategory | null {
  const category =
    firstRelation(
      value.service_categories,
    );

  if (!category) {
    return null;
  }

  return {
    id:
      category.id,

    name:
      category.name,

    active:
      category.active,
  };
}

function normalizeLanguage(
  value:
    RawAgencyLanguage,
): Language | null {
  const language =
    firstRelation(
      value.languages,
    );

  if (!language) {
    return null;
  }

  return {
    id:
      language.id,

    name:
      language.name,

    code:
      language.code,

    active:
      language.active,
  };
}

function normalizeAgency(
  raw:
    RawAgency,
  categoriesSource?:
    RawAgencyCategory[],
  languagesSource?:
    RawAgencyLanguage[],
): Agency {
  const categoryRelations =
    categoriesSource ??
    raw.agency_service_categories ??
    [];

  const languageRelations =
    languagesSource ??
    raw.agency_languages ??
    [];

  const categories =
    categoryRelations
      .map(
        normalizeCategory,
      )
      .filter(
        (
          value,
        ): value is ServiceCategory =>
          value !== null,
      );

  const languages =
    languageRelations
      .map(
        normalizeLanguage,
      )
      .filter(
        (
          value,
        ): value is Language =>
          value !== null,
      );

  return {
    id:
      raw.id,

    ownerUserId:
      raw.owner_user_id,

    agencyName:
      raw.agency_name,

    commercialName:
      raw.commercial_name,

    businessType:
      raw.business_type,

    description:
      raw.description,

    email:
      raw.email,

    phone:
      raw.phone,

    website:
      raw.website,

    country:
      raw.country,

    province:
      raw.province,

    city:
      raw.city,

    exactAddress:
      raw.exact_address,

    logoUrl:
      raw.logo_url,

    coverUrl:
      raw.cover_url,

    verificationDocumentUrl:
      raw.verification_document_url,

    instagramUrl:
      raw.instagram_url,

    facebookUrl:
      raw.facebook_url,

    whatsapp:
      raw.whatsapp,

    status:
      raw.status,

    acceptedTerms:
      raw.accepted_terms,

    termsAcceptedAt:
      raw.terms_accepted_at,

    createdAt:
      raw.created_at,

    updatedAt:
      raw.updated_at,

    categories,

    languages,
  };
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const body =
    await response
      .json()
      .catch(
        () =>
          null,
      ) as { message?: string; error?: string } | null;

  if (
    !response.ok
  ) {
    const message =
      body?.message ??
      body?.error ??
      "No se pudo procesar la solicitud.";

    throw new Error(
      message,
    );
  }

  return body as unknown as T;
}

export interface AdminAgencyFilters {
  status?:
    | AgencyStatus
    | "";

  search?:
    string;
}

export async function getAdminAgencies(
  filters:
    AdminAgencyFilters = {},
): Promise<Agency[]> {
  const params =
    new URLSearchParams();

  if (
    filters.status
  ) {
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
    await apiFetch(
      `/api/admin/agencies${query ? `?${query}` : ""}`,
      {
        method:
          "GET",

        credentials:
          "include",

        cache:
          "no-store",
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        RawAgency[]
      >
    >(
      response,
    );

  return result.data.map(
    (
      agency,
    ) =>
      normalizeAgency(
        agency,
      ),
  );
}

export async function getAdminAgency(
  agencyId: string,
): Promise<Agency> {
  const response =
    await apiFetch(
      `/api/admin/agencies/${encodeURIComponent(agencyId)}`,
      {
        method:
          "GET",

        credentials:
          "include",

        cache:
          "no-store",
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        RawAgencyDetail
      >
    >(
      response,
    );

  return normalizeAgency(
    result.data.agency,
    result.data.categories,
    result.data.languages,
  );
}

export async function reviewAgency(
  agencyId: string,
  status:
    | "APPROVED"
    | "REJECTED",
): Promise<AgencyStatus> {
  const response =
    await apiFetch(
      `/api/admin/agencies/${encodeURIComponent(agencyId)}/status`,
      {
        method:
          "PATCH",

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
      ApiResponse<
        RawAgency
      >
    >(
      response,
    );

  return result.data.status;
}

export async function getAgencyVerificationDocument(
  agencyId: string,
): Promise<VerificationDocumentResponse> {
  const response =
    await apiFetch(
      `/api/admin/agencies/${encodeURIComponent(agencyId)}/verification-document`,
      {
        method:
          "GET",

        credentials:
          "include",

        cache:
          "no-store",
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        VerificationDocumentResponse
      >
    >(
      response,
    );

  return result.data;
}