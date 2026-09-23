import {
  ApiError,
  apiErrorResponse,
  assertSameOrigin,
} from "@/lib/api/errors";

import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

import { requireAppSession } from "@/lib/supabase/session";

type PublicationAction =
  | "DRAFT"
  | "SUBMIT";

type ServiceType =
  | "EXCURSION"
  | "TRANSPORT";

type CreatePublicationPayload = {
  serviceType?: ServiceType | "";
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

  action?: PublicationAction;
};

const VALID_SERVICE_TYPES: ServiceType[] = [
  "EXCURSION",
  "TRANSPORT",
];

function cleanText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0
    ? cleaned
    : null;
}

function normalizeNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function normalizeIds(
  values: unknown,
): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter(
          (value) =>
            Number.isInteger(value) &&
            value > 0,
        ),
    ),
  );
}

function validateDraft(
  payload: CreatePublicationPayload,
) {
  const serviceType =
    cleanText(payload.serviceType);

  if (
    serviceType &&
    !VALID_SERVICE_TYPES.includes(
      serviceType as ServiceType,
    )
  ) {
    throw new ApiError(
      "El tipo de servicio no es válido.",
      400,
    );
  }

  const price =
    normalizeNumber(
      payload.pricePerPerson,
    );

  if (
    price !== null &&
    price < 0
  ) {
    throw new ApiError(
      "El precio no puede ser negativo.",
      400,
    );
  }

  const duration =
    normalizeNumber(
      payload.durationMinutes,
    );

  if (
    duration !== null &&
    (
      !Number.isInteger(duration) ||
      duration <= 0
    )
  ) {
    throw new ApiError(
      "La duración debe ser mayor que cero.",
      400,
    );
  }

  const capacity =
    normalizeNumber(
      payload.defaultCapacity,
    );

  if (
    capacity !== null &&
    (
      !Number.isInteger(capacity) ||
      capacity <= 0
    )
  ) {
    throw new ApiError(
      "El cupo máximo debe ser mayor que cero.",
      400,
    );
  }
}

function validateSubmit(
  payload: CreatePublicationPayload,
) {
  validateDraft(payload);

  const serviceType =
    cleanText(payload.serviceType);

  const title =
    cleanText(payload.title);

  const description =
    cleanText(payload.description);

  const destination =
    cleanText(payload.destination);

  const included =
    cleanText(payload.included);

  const notIncluded =
    cleanText(payload.notIncluded);

  const meetingPoint =
    cleanText(payload.meetingPoint);

  const mainImageUrl =
    cleanText(payload.mainImageUrl);

  const price =
    normalizeNumber(
      payload.pricePerPerson,
    );

  const duration =
    normalizeNumber(
      payload.durationMinutes,
    );

  const capacity =
    normalizeNumber(
      payload.defaultCapacity,
    );

  const languageIds =
    normalizeIds(
      payload.languageIds,
    );

  if (!serviceType) {
    throw new ApiError(
      "Debes seleccionar un tipo de servicio.",
      400,
    );
  }

  if (
    !VALID_SERVICE_TYPES.includes(
      serviceType as ServiceType,
    )
  ) {
    throw new ApiError(
      "El tipo de servicio no es válido.",
      400,
    );
  }

  if (!title) {
    throw new ApiError(
      "El nombre de la publicación es obligatorio.",
      400,
    );
  }

  if (title.length > 150) {
    throw new ApiError(
      "El nombre de la publicación es demasiado largo.",
      400,
    );
  }

  if (!description) {
    throw new ApiError(
      "La descripción es obligatoria.",
      400,
    );
  }

  if (
    description.length > 1000
  ) {
    throw new ApiError(
      "La descripción no puede superar los 1000 caracteres.",
      400,
    );
  }

  if (!destination) {
    throw new ApiError(
      "El destino es obligatorio.",
      400,
    );
  }

  if (
    price === null ||
    price <= 0
  ) {
    throw new ApiError(
      "El precio por persona debe ser mayor que cero.",
      400,
    );
  }

  if (
    duration === null ||
    !Number.isInteger(duration) ||
    duration <= 0
  ) {
    throw new ApiError(
      "La duración es obligatoria.",
      400,
    );
  }

  if (
    languageIds.length === 0
  ) {
    throw new ApiError(
      "Debes seleccionar al menos un idioma.",
      400,
    );
  }

  if (!included) {
    throw new ApiError(
      "Debes indicar qué incluye el servicio.",
      400,
    );
  }

  if (!notIncluded) {
    throw new ApiError(
      "Debes indicar qué no incluye el servicio.",
      400,
    );
  }

  if (!meetingPoint) {
    throw new ApiError(
      "El punto de encuentro es obligatorio.",
      400,
    );
  }

  if (!mainImageUrl) {
    throw new ApiError(
      "La imagen principal es obligatoria.",
      400,
    );
  }

  if (
    capacity === null ||
    !Number.isInteger(capacity) ||
    capacity <= 0
  ) {
    throw new ApiError(
      "El cupo máximo es obligatorio y debe ser mayor que cero.",
      400,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    /*
     * En desarrollo local, si no existen
     * secretos de Supabase, la petición
     * se reenvía al backend compartido.
     */
    const remote =
      await proxyRemoteApiRequest(
        request,
      );

    if (remote) {
      return remote;
    }

    assertSameOrigin(request);

    /*
     * requireAppSession necesita el request.
     */
    const appSession =
      await requireAppSession(
        request,
      );

    /*
     * El rol está en profile.
     */
    const role =
      appSession.profile.role;

    if (
      role !== "Agencia" &&
      role !== "Transporte"
    ) {
      throw new ApiError(
        "No tienes permisos para crear publicaciones.",
        403,
      );
    }

    let payload:
      CreatePublicationPayload;

    try {
      payload =
        (await request.json()) as
          CreatePublicationPayload;
    } catch {
      throw new ApiError(
        "El cuerpo de la solicitud no es válido.",
        400,
      );
    }

    const action:
      PublicationAction =
      payload.action === "SUBMIT"
        ? "SUBMIT"
        : "DRAFT";

    if (action === "SUBMIT") {
      validateSubmit(payload);
    } else {
      validateDraft(payload);
    }

    const supabase =
      getSupabaseAdminClient();

    /*
     * Nunca recibimos agencyId desde
     * el frontend.
     *
     * El owner se obtiene de la sesión.
     */
    const userId =
      appSession.session.userId;

    const {
      data: agency,
      error: agencyError,
    } = await supabase
      .from("agencies")
      .select(
        `
          id,
          status
        `,
      )
      .eq(
        "owner_user_id",
        userId,
      )
      .maybeSingle();

    if (agencyError) {
      throw new ApiError(
        "No se pudo consultar la agencia del usuario.",
        500,
      );
    }

    if (!agency) {
      throw new ApiError(
        "Debes registrar una agencia antes de crear publicaciones.",
        400,
      );
    }

    if (
      agency.status === "INACTIVE"
    ) {
      throw new ApiError(
        "La agencia está inactiva.",
        409,
      );
    }

    /*
     * Un proveedor puede preparar
     * borradores aunque la agencia
     * todavía no esté aprobada.
     *
     * Para enviar una publicación
     * a revisión sí exigimos una
     * agencia aprobada.
     */
    if (
      action === "SUBMIT" &&
      agency.status !== "APPROVED"
    ) {
      throw new ApiError(
        "La agencia debe estar aprobada antes de enviar publicaciones a revisión.",
        409,
      );
    }

    const serviceType =
      cleanText(
        payload.serviceType,
      );

    const title =
      cleanText(payload.title);

    const description =
      cleanText(
        payload.description,
      );

    const destination =
      cleanText(
        payload.destination,
      );

    const included =
      cleanText(
        payload.included,
      );

    const notIncluded =
      cleanText(
        payload.notIncluded,
      );

    const meetingPoint =
      cleanText(
        payload.meetingPoint,
      );

    const mainImageUrl =
      cleanText(
        payload.mainImageUrl,
      );

    const price =
      normalizeNumber(
        payload.pricePerPerson,
      );

    const duration =
      normalizeNumber(
        payload.durationMinutes,
      );

    const capacity =
      normalizeNumber(
        payload.defaultCapacity,
      );

    const languageIds =
      normalizeIds(
        payload.languageIds,
      );

    /*
     * Validar que los idiomas realmente
     * existan y estén activos.
     */
    if (
      languageIds.length > 0
    ) {
      const {
        data: validLanguages,
        error: languagesError,
      } = await supabase
        .from("languages")
        .select("id")
        .in(
          "id",
          languageIds,
        )
        .eq(
          "active",
          true,
        );

      if (languagesError) {
        throw new ApiError(
          "No se pudieron validar los idiomas.",
          500,
        );
      }

      const validLanguageIds =
        new Set(
          (
            validLanguages ?? []
          ).map(
            (language) =>
              Number(language.id),
          ),
        );

      const hasInvalidLanguage =
        languageIds.some(
          (id) =>
            !validLanguageIds.has(id),
        );

      if (hasInvalidLanguage) {
        throw new ApiError(
          "Uno o más idiomas seleccionados no son válidos.",
          400,
        );
      }
    }

    const publicationStatus =
      action === "SUBMIT"
        ? "PENDING"
        : "DRAFT";

    const {
      data: publication,
      error: publicationError,
    } = await supabase
      .from("publications")
      .insert({
        agency_id:
          agency.id,

        service_type:
          serviceType,

        title,

        description,

        destination,

        price_per_person:
          price,

        duration_minutes:
          duration,

        included,

        not_included:
          notIncluded,

        meeting_point:
          meetingPoint,

        main_image_url:
          mainImageUrl,

        default_capacity:
          capacity,

        status:
          publicationStatus,
      })
      .select(
        `
          id,
          agency_id,
          service_type,
          title,
          description,
          destination,
          price_per_person,
          duration_minutes,
          included,
          not_included,
          meeting_point,
          main_image_url,
          default_capacity,
          status,
          created_at,
          updated_at
        `,
      )
      .single();

    if (
      publicationError ||
      !publication
    ) {
      console.error(
        "Error creando publicación:",
        publicationError,
      );

      throw new ApiError(
        "No se pudo crear la publicación.",
        500,
      );
    }

    /*
     * Guardar idiomas.
     */
    if (
      languageIds.length > 0
    ) {
      const languageRows =
        languageIds.map(
          (languageId) => ({
            publication_id:
              publication.id,

            language_id:
              languageId,
          }),
        );

      const {
        error:
          publicationLanguagesError,
      } = await supabase
        .from(
          "publication_languages",
        )
        .insert(
          languageRows,
        );

      /*
       * Todavía no estamos usando una
       * función SQL transaccional.
       *
       * Si falla el guardado de idiomas,
       * eliminamos la publicación creada
       * para evitar datos incompletos.
       */
      if (
        publicationLanguagesError
      ) {
        console.error(
          "Error guardando idiomas:",
          publicationLanguagesError,
        );

        await supabase
          .from("publications")
          .delete()
          .eq(
            "id",
            publication.id,
          );

        throw new ApiError(
          "No se pudieron guardar los idiomas de la publicación.",
          500,
        );
      }
    }

    return Response.json(
      {
        data: {
          ...publication,

          languageIds,
        },
      },
      {
        status: 201,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(
      error,
    );
  }
}