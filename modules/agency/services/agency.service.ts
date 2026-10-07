import { apiFetch } from "@/lib/api/browser-fetch";
import type {
  Agency,
  AgencyStatus,
  BusinessType,
  Language,
  SaveAgencyPayload,
  ServiceCategory,
} from "../types/agency.types";

interface ApiResponse<T> {
  data: T;
}

interface RawServiceCategory {
  id: number;
  name: string;
  active?: boolean;
}

interface RawLanguage {
  id: number;
  name: string;
  code?: string;
  active?: boolean;
}

interface RawCategoryRelation {
  category_id?: number;

  service_categories?:
    | RawServiceCategory
    | RawServiceCategory[]
    | null;
}

interface RawLanguageRelation {
  language_id?: number;

  languages?:
    | RawLanguage
    | RawLanguage[]
    | null;
}

interface RawAgency {
  id: string;

  owner_user_id?: string;
  ownerUserId?: string;

  agency_name?: string;
  agencyName?: string;

  commercial_name?: string;
  commercialName?: string;

  business_type?: BusinessType;
  businessType?: BusinessType;

  description?: string | null;

  email?: string | null;
  phone?: string | null;
  website?: string | null;

  country?: string | null;
  province?: string | null;
  city?: string | null;

  exact_address?: string | null;
  exactAddress?: string | null;

  logo_url?: string | null;
  logoUrl?: string | null;

  cover_url?: string | null;
  coverUrl?: string | null;

  verification_document_url?: string | null;
  verificationDocumentUrl?: string | null;

  instagram_url?: string | null;
  instagramUrl?: string | null;

  facebook_url?: string | null;
  facebookUrl?: string | null;

  whatsapp?: string | null;

  status: AgencyStatus;

  accepted_terms?: boolean;
  acceptedTerms?: boolean;

  terms_accepted_at?: string | null;
  termsAcceptedAt?: string | null;

  created_at?: string;
  createdAt?: string;

  updated_at?: string;
  updatedAt?: string;

  categories?: ServiceCategory[];
  languages?: Language[];
}

interface RawAgencyBundle {
  agency: RawAgency;

  categories?:
    | RawCategoryRelation[]
    | ServiceCategory[];

  languages?:
    | RawLanguageRelation[]
    | Language[];

  categoryIds?: number[];
  languageIds?: number[];
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const body = await response
    .json()
    .catch(() => null) as { message?: string; error?: string } | null;

  if (!response.ok) {
    const message =
      body?.message ??
      body?.error ??
      "Ocurrió un error al procesar la solicitud.";

    throw new Error(message);
  }

  return body as unknown as T;
}

function firstValue<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeCategories(
  categories:
    | RawCategoryRelation[]
    | ServiceCategory[]
    | undefined,
  categoryIds: number[] = [],
): ServiceCategory[] {
  if (
    categories &&
    categories.length > 0
  ) {
    return categories
      .map((item) => {
        if (
          "service_categories" in item
        ) {
          const category =
            firstValue(
              item.service_categories,
            );

          if (!category) {
            return null;
          }

          return {
            id: category.id,
            name: category.name,
            active:
              category.active ??
              true,
          };
        }

        if (
          "id" in item &&
          "name" in item
        ) {
          return {
            id: item.id,
            name: item.name,
            active:
              item.active ??
              true,
          };
        }

        return null;
      })
      .filter(
        (
          category,
        ): category is ServiceCategory =>
          category !== null,
      );
  }

  /*
   * El PATCH actualmente devuelve categoryIds
   * en lugar de las categorías completas.
   *
   * Estos nombres coinciden con el catálogo
   * utilizado actualmente por AgencyForm.
   */
  const categoryNames:
    Record<number, string> = {
    1: "Aventura",
    2: "Naturaleza",
    3: "Cultura",
    4: "Transporte",
    5: "Playa",
    6: "Bienestar",
  };

  return categoryIds.map(
    (id) => ({
      id,
      name:
        categoryNames[id] ??
        `Categoría ${id}`,
      active: true,
    }),
  );
}

function normalizeLanguages(
  languages:
    | RawLanguageRelation[]
    | Language[]
    | undefined,
  languageIds: number[] = [],
): Language[] {
  if (
    languages &&
    languages.length > 0
  ) {
    return languages
      .map((item) => {
        if (
          "languages" in item
        ) {
          const language =
            firstValue(
              item.languages,
            );

          if (!language) {
            return null;
          }

          return {
            id: language.id,
            name: language.name,
            code:
              language.code ??
              "",
            active:
              language.active ??
              true,
          };
        }

        if (
          "id" in item &&
          "name" in item
        ) {
          return {
            id: item.id,
            name: item.name,
            code:
              item.code ??
              "",
            active:
              item.active ??
              true,
          };
        }

        return null;
      })
      .filter(
        (
          language,
        ): language is Language =>
          language !== null,
      );
  }

  const languageCatalog:
    Record<
      number,
      {
        name: string;
        code: string;
      }
    > = {
    1: {
      name: "Español",
      code: "es",
    },

    2: {
      name: "Inglés",
      code: "en",
    },
  };

  return languageIds.map(
    (id) => ({
      id,

      name:
        languageCatalog[id]
          ?.name ??
        `Idioma ${id}`,

      code:
        languageCatalog[id]
          ?.code ??
        "",

      active: true,
    }),
  );
}

function normalizeAgency(
  raw: RawAgency,

  categories:
    | RawCategoryRelation[]
    | ServiceCategory[]
    | undefined = undefined,

  languages:
    | RawLanguageRelation[]
    | Language[]
    | undefined = undefined,

  categoryIds: number[] = [],

  languageIds: number[] = [],
): Agency {
  return {
    id: raw.id,

    ownerUserId:
      raw.ownerUserId ??
      raw.owner_user_id ??
      "",

    agencyName:
      raw.agencyName ??
      raw.agency_name ??
      "",

    commercialName:
      raw.commercialName ??
      raw.commercial_name ??
      "",

    businessType:
      raw.businessType ??
      raw.business_type ??
      "AGENCY",

    description:
      raw.description ??
      null,

    email:
      raw.email ??
      null,

    phone:
      raw.phone ??
      null,

    website:
      raw.website ??
      null,

    country:
      raw.country ??
      null,

    province:
      raw.province ??
      null,

    city:
      raw.city ??
      null,

    exactAddress:
      raw.exactAddress ??
      raw.exact_address ??
      null,

    logoUrl:
      raw.logoUrl ??
      raw.logo_url ??
      null,

    coverUrl:
      raw.coverUrl ??
      raw.cover_url ??
      null,

    verificationDocumentUrl:
      raw.verificationDocumentUrl ??
      raw.verification_document_url ??
      null,

    instagramUrl:
      raw.instagramUrl ??
      raw.instagram_url ??
      null,

    facebookUrl:
      raw.facebookUrl ??
      raw.facebook_url ??
      null,

    whatsapp:
      raw.whatsapp ??
      null,

    status:
      raw.status,

    acceptedTerms:
      raw.acceptedTerms ??
      raw.accepted_terms ??
      false,

    termsAcceptedAt:
      raw.termsAcceptedAt ??
      raw.terms_accepted_at ??
      null,

    createdAt:
      raw.createdAt ??
      raw.created_at ??
      "",

    updatedAt:
      raw.updatedAt ??
      raw.updated_at ??
      "",

    categories:
      normalizeCategories(
        categories ??
          raw.categories,
        categoryIds,
      ),

    languages:
      normalizeLanguages(
        languages ??
          raw.languages,
        languageIds,
      ),
  };
}

function normalizeAgencyData(
  data:
    | RawAgencyBundle
    | RawAgency
    | Agency
    | null,
): Agency | null {
  if (!data) {
    return null;
  }

  if (
    "agency" in data &&
    data.agency
  ) {
    return normalizeAgency(
      data.agency,

      data.categories,

      data.languages,

      data.categoryIds ??
        [],

      data.languageIds ??
        [],
    );
  }

  return normalizeAgency(
    data as RawAgency,
  );
}

export async function getMyAgency(): Promise<
  Agency | null
> {
  const response =
    await apiFetch(
      "/api/agencies/me",
      {
        method: "GET",

        credentials:
          "include",

        cache:
          "no-store",
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        | RawAgencyBundle
        | RawAgency
        | Agency
        | null
      >
    >(response);

  return normalizeAgencyData(
    result.data,
  );
}

export async function createAgency(
  payload: SaveAgencyPayload,
): Promise<Agency> {
  const response =
    await apiFetch(
      "/api/agencies",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify(
            payload,
          ),
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        | RawAgencyBundle
        | RawAgency
        | Agency
      >
    >(response);

  const agency =
    normalizeAgencyData(
      result.data,
    );

  if (!agency) {
    throw new Error(
      "No se pudo crear la agencia.",
    );
  }

  return agency;
}

export async function updateMyAgency(
  payload: SaveAgencyPayload,
): Promise<Agency> {
  const response =
    await apiFetch(
      "/api/agencies/me",
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify(
            payload,
          ),
      },
    );

  const result =
    await parseResponse<
      ApiResponse<
        | RawAgencyBundle
        | RawAgency
        | Agency
      >
    >(response);

  const agency =
    normalizeAgencyData(
      result.data,
    );

  if (!agency) {
    throw new Error(
      "No se pudo actualizar la agencia.",
    );
  }

  return agency;
}

export async function deleteMyAgency(): Promise<void> {
  const response =
    await apiFetch(
      "/api/agencies/me",
      {
        method:
          "DELETE",

        credentials:
          "include",
      },
    );

  await parseResponse(
    response,
  );
}