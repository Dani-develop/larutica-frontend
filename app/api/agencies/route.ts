import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";

const BUSINESS_TYPES = [
  "AGENCY",
  "TOUR_OPERATOR",
  "TRANSPORT",
  "INDEPENDENT_GUIDE",
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number];

type AgencyAction = "DRAFT" | "SUBMIT";

type CreateAgencyPayload = {
  agencyName?: string;
  commercialName?: string;
  businessType?: BusinessType;
  description?: string;

  email?: string;
  phone?: string;
  website?: string;

  country?: string;
  province?: string;
  city?: string;
  exactAddress?: string;

  logoUrl?: string;
  coverUrl?: string;
  verificationDocumentUrl?: string;

  instagramUrl?: string;
  facebookUrl?: string;
  whatsapp?: string;

  categoryIds?: number[];
  languageIds?: number[];

  acceptedTerms?: boolean;

  action?: AgencyAction;
};

type ParsedAgencyPayload = {
  agencyName: string;
  commercialName: string;
  businessType: BusinessType;

  description: string | null;

  email: string | null;
  phone: string | null;
  website: string | null;

  country: string | null;
  province: string | null;
  city: string | null;
  exactAddress: string | null;

  logoUrl: string | null;
  coverUrl: string | null;
  verificationDocumentUrl: string | null;

  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsapp: string | null;

  categoryIds: number[];
  languageIds: number[];

  acceptedTerms: boolean;
  action: AgencyAction;
};

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function uniquePositiveIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (item): item is number =>
          typeof item === "number" &&
          Number.isInteger(item) &&
          item > 0,
      ),
    ),
  ];
}

function parsePayload(value: unknown): ParsedAgencyPayload {
  if (!value || typeof value !== "object") {
    throw new ApiError("Los datos de la agencia no son válidos.", 400);
  }

  const body = value as CreateAgencyPayload;

  const agencyName = cleanOptionalString(body.agencyName) ?? "";
  const commercialName = cleanOptionalString(body.commercialName) ?? "";
  const businessType = body.businessType;

  const action: AgencyAction =
    body.action === "SUBMIT" ? "SUBMIT" : "DRAFT";

  if (agencyName.length < 2) {
    throw new ApiError(
      "El nombre de la agencia debe tener al menos 2 caracteres.",
      400,
    );
  }

  if (commercialName.length < 2) {
    throw new ApiError(
      "El nombre comercial debe tener al menos 2 caracteres.",
      400,
    );
  }

  if (!businessType || !BUSINESS_TYPES.includes(businessType)) {
    throw new ApiError("El tipo de negocio no es válido.", 400);
  }

  const payload: ParsedAgencyPayload = {
    agencyName,
    commercialName,
    businessType,

    description: cleanOptionalString(body.description),

    email: cleanOptionalString(body.email)?.toLowerCase() ?? null,
    phone: cleanOptionalString(body.phone),
    website: cleanOptionalString(body.website),

    country: cleanOptionalString(body.country),
    province: cleanOptionalString(body.province),
    city: cleanOptionalString(body.city),
    exactAddress: cleanOptionalString(body.exactAddress),

    logoUrl: cleanOptionalString(body.logoUrl),
    coverUrl: cleanOptionalString(body.coverUrl),
    verificationDocumentUrl: cleanOptionalString(
      body.verificationDocumentUrl,
    ),

    instagramUrl: cleanOptionalString(body.instagramUrl),
    facebookUrl: cleanOptionalString(body.facebookUrl),
    whatsapp: cleanOptionalString(body.whatsapp),

    categoryIds: uniquePositiveIds(body.categoryIds),
    languageIds: uniquePositiveIds(body.languageIds),

    acceptedTerms: body.acceptedTerms === true,
    action,
  };

  if (payload.action === "SUBMIT") {
    if (!payload.description) {
      throw new ApiError("La descripción es obligatoria.", 400);
    }

    if (!payload.email || !/^\S+@\S+\.\S+$/.test(payload.email)) {
      throw new ApiError("Debes ingresar un correo válido.", 400);
    }

    if (!payload.phone) {
      throw new ApiError("El teléfono es obligatorio.", 400);
    }

    if (
      !payload.country ||
      !payload.province ||
      !payload.city ||
      !payload.exactAddress
    ) {
      throw new ApiError(
        "La ubicación de la agencia debe estar completa.",
        400,
      );
    }

    if (!payload.logoUrl) {
      throw new ApiError("Debes agregar el logo de la agencia.", 400);
    }

    if (!payload.coverUrl) {
      throw new ApiError(
        "Debes agregar la imagen de portada de la agencia.",
        400,
      );
    }

    if (!payload.verificationDocumentUrl) {
      throw new ApiError(
        "Debes adjuntar un documento de verificación.",
        400,
      );
    }

    if (payload.categoryIds.length === 0) {
      throw new ApiError(
        "Debes seleccionar al menos una categoría de servicio.",
        400,
      );
    }

    if (payload.languageIds.length === 0) {
      throw new ApiError(
        "Debes seleccionar al menos un idioma.",
        400,
      );
    }

    if (!payload.acceptedTerms) {
      throw new ApiError(
        "Debes aceptar los términos y condiciones.",
        400,
      );
    }
  }

  return payload;
}

async function validateCategoryIds(categoryIds: number[]): Promise<void> {
  if (categoryIds.length === 0) {
    return;
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("service_categories")
    .select("id")
    .in("id", categoryIds)
    .eq("active", true);

  if (error) {
    throw error;
  }

  if ((data?.length ?? 0) !== categoryIds.length) {
    throw new ApiError(
      "Una o más categorías seleccionadas no son válidas.",
      400,
    );
  }
}

async function validateLanguageIds(languageIds: number[]): Promise<void> {
  if (languageIds.length === 0) {
    return;
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("languages")
    .select("id")
    .in("id", languageIds)
    .eq("active", true);

  if (error) {
    throw error;
  }

  if ((data?.length ?? 0) !== languageIds.length) {
    throw new ApiError(
      "Uno o más idiomas seleccionados no son válidos.",
      400,
    );
  }
}

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);

  if (remote) {
    return remote;
  }

  try {
    assertSameOrigin(request);

    const appSession = await requireAppSession(request);

    if (!["Agencia", "Transporte"].includes(appSession.profile.role)) {
      throw new ApiError(
        "Tu cuenta no tiene permisos para registrar una agencia.",
        403,
      );
    }

    const payload = parsePayload(await request.json());

    const admin = getSupabaseAdminClient();
    const ownerUserId = appSession.session.userId;

    const { data: existingAgency, error: existingAgencyError } = await admin
      .from("agencies")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();

    if (existingAgencyError) {
      throw existingAgencyError;
    }

    if (existingAgency) {
      throw new ApiError(
        "Ya existe una agencia asociada a esta cuenta.",
        409,
      );
    }

    await validateCategoryIds(payload.categoryIds);
    await validateLanguageIds(payload.languageIds);

    const status = payload.action === "SUBMIT" ? "PENDING" : "DRAFT";

    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .insert({
        owner_user_id: ownerUserId,

        agency_name: payload.agencyName,
        commercial_name: payload.commercialName,
        business_type: payload.businessType,
        description: payload.description,

        email: payload.email,
        phone: payload.phone,
        website: payload.website,

        country: payload.country,
        province: payload.province,
        city: payload.city,
        exact_address: payload.exactAddress,

        logo_url: payload.logoUrl,
        cover_url: payload.coverUrl,
        verification_document_url: payload.verificationDocumentUrl,

        instagram_url: payload.instagramUrl,
        facebook_url: payload.facebookUrl,
        whatsapp: payload.whatsapp,

        status,

        accepted_terms: payload.acceptedTerms,
        terms_accepted_at: payload.acceptedTerms
          ? new Date().toISOString()
          : null,
      })
      .select("*")
      .single();

    if (agencyError || !agency) {
      throw agencyError ?? new Error("No se pudo crear la agencia.");
    }

    try {
      if (payload.categoryIds.length > 0) {
        const { error } = await admin
          .from("agency_service_categories")
          .insert(
            payload.categoryIds.map((categoryId) => ({
              agency_id: agency.id,
              category_id: categoryId,
            })),
          );

        if (error) {
          throw error;
        }
      }

      if (payload.languageIds.length > 0) {
        const { error } = await admin
          .from("agency_languages")
          .insert(
            payload.languageIds.map((languageId) => ({
              agency_id: agency.id,
              language_id: languageId,
            })),
          );

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      await admin
        .from("agencies")
        .delete()
        .eq("id", agency.id);

      throw error;
    }

    return Response.json(
      {
        data: {
          agency,
          categoryIds: payload.categoryIds,
          languageIds: payload.languageIds,
        },
      },
      {
        status: 201,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}