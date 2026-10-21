import type { Journey } from "@/modules/journeys/types";
import { parseJourney } from "@/lib/maps/validation";
import { verifyJourney } from "@/lib/maps/provider";
import {
  ApiError,
  apiErrorResponse,
  assertSameOrigin,
} from "@/lib/api/errors";

import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

import { requireAppSession } from "@/lib/supabase/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PublicationAction =
  | "DRAFT"
  | "SUBMIT";

type ServiceType =
  | "EXCURSION"
  | "TRANSPORT";

type UpdatePublicationPayload = {
  serviceType?: ServiceType | "";
  title?: string;
  description?: string;
  destination?: string;

  pricePerPerson?: number | null;
  durationMinutes?: number | null;

  included?: string;
  notIncluded?: string;

  journey?: Journey | null;
  meetingPoint?: string;

  mainImageUrl?: string;

  defaultCapacity?: number | null;

  languageIds?: number[];

  action?: PublicationAction;
};

type PublicationRow = {
  journey: Journey | null;
  journey_required: boolean;
  id: string;
  agency_id: string;

  service_type:
    | "EXCURSION"
    | "TRANSPORT"
    | null;

  title: string | null;
  description: string | null;
  destination: string | null;

  price_per_person:
    | number
    | string
    | null;

  duration_minutes:
    | number
    | null;

  included:
    | string
    | null;

  not_included:
    | string
    | null;

  meeting_point:
    | string
    | null;

  main_image_url:
    | string
    | null;

  default_capacity:
    | number
    | null;

  status:
    | "DRAFT"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "INACTIVE";

  created_at: string;
  updated_at: string;
};

type PublicationLanguageRow = {
  language_id: number;
};

function cleanText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned =
    value.trim();

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

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
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
        .map((value) =>
          Number(value),
        )
        .filter(
          (value) =>
            Number.isInteger(
              value,
            ) &&
            value > 0,
        ),
    ),
  );
}

function hasOwn(
  object: object,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    object,
    key,
  );
}

function validateServiceType(
  value: string | null,
) {
  if (
    value &&
    ![
      "EXCURSION",
      "TRANSPORT",
    ].includes(value)
  ) {
    throw new ApiError(
      "El tipo de servicio no es válido.",
      400,
    );
  }
}

function validateDraftPayload(
  payload: UpdatePublicationPayload,
) {
  if (
    hasOwn(
      payload,
      "serviceType",
    )
  ) {
    validateServiceType(
      cleanText(
        payload.serviceType,
      ),
    );
  }

  if (
    hasOwn(
      payload,
      "pricePerPerson",
    )
  ) {
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
  }

  if (
    hasOwn(
      payload,
      "durationMinutes",
    )
  ) {
    const duration =
      normalizeNumber(
        payload.durationMinutes,
      );

    if (
      duration !== null &&
      (
        !Number.isInteger(
          duration,
        ) ||
        duration <= 0
      )
    ) {
      throw new ApiError(
        "La duración debe ser mayor que cero.",
        400,
      );
    }
  }

  if (
    hasOwn(
      payload,
      "defaultCapacity",
    )
  ) {
    const capacity =
      normalizeNumber(
        payload.defaultCapacity,
      );

    if (
      capacity !== null &&
      (
        !Number.isInteger(
          capacity,
        ) ||
        capacity <= 0
      )
    ) {
      throw new ApiError(
        "El cupo máximo debe ser mayor que cero.",
        400,
      );
    }
  }

  if (
    hasOwn(
      payload,
      "title",
    )
  ) {
    const title =
      cleanText(
        payload.title,
      );

    if (
      title &&
      title.length > 150
    ) {
      throw new ApiError(
        "El nombre de la publicación es demasiado largo.",
        400,
      );
    }
  }

  if (
    hasOwn(
      payload,
      "description",
    )
  ) {
    const description =
      cleanText(
        payload.description,
      );

    if (
      description &&
      description.length >
        1000
    ) {
      throw new ApiError(
        "La descripción no puede superar los 1000 caracteres.",
        400,
      );
    }
  }
}

function validateSubmitState(
  publication: {
    serviceType:
      | ServiceType
      | null;
    title:
      | string
      | null;
    description:
      | string
      | null;
    destination:
      | string
      | null;
    pricePerPerson:
      | number
      | null;
    durationMinutes:
      | number
      | null;
    included:
      | string
      | null;
    notIncluded:
      | string
      | null;
    meetingPoint:
      | string
      | null;
    mainImageUrl:
      | string
      | null;
    defaultCapacity:
      | number
      | null;
    languageIds:
      number[];
  },
) {
  if (
    !publication.serviceType
  ) {
    throw new ApiError(
      "Debes seleccionar un tipo de servicio.",
      400,
    );
  }

  validateServiceType(
    publication.serviceType,
  );

  if (
    !publication.title
  ) {
    throw new ApiError(
      "El nombre de la publicación es obligatorio.",
      400,
    );
  }

  if (
    publication.title.length >
    150
  ) {
    throw new ApiError(
      "El nombre de la publicación es demasiado largo.",
      400,
    );
  }

  if (
    !publication.description
  ) {
    throw new ApiError(
      "La descripción es obligatoria.",
      400,
    );
  }

  if (
    publication.description
      .length > 1000
  ) {
    throw new ApiError(
      "La descripción no puede superar los 1000 caracteres.",
      400,
    );
  }

  if (
    !publication.destination
  ) {
    throw new ApiError(
      "El destino es obligatorio.",
      400,
    );
  }

  if (
    publication.pricePerPerson ===
      null ||
    publication.pricePerPerson <=
      0
  ) {
    throw new ApiError(
      "El precio por persona debe ser mayor que cero.",
      400,
    );
  }

  if (
    publication.durationMinutes ===
      null ||
    !Number.isInteger(
      publication.durationMinutes,
    ) ||
    publication.durationMinutes <=
      0
  ) {
    throw new ApiError(
      "La duración es obligatoria.",
      400,
    );
  }

  if (
    publication.languageIds
      .length === 0
  ) {
    throw new ApiError(
      "Debes seleccionar al menos un idioma.",
      400,
    );
  }

  if (
    !publication.included
  ) {
    throw new ApiError(
      "Debes indicar qué incluye el servicio.",
      400,
    );
  }

  if (
    !publication.notIncluded
  ) {
    throw new ApiError(
      "Debes indicar qué no incluye el servicio.",
      400,
    );
  }

  if (
    !publication.meetingPoint
  ) {
    throw new ApiError(
      "El punto de encuentro es obligatorio.",
      400,
    );
  }

  if (
    !publication.mainImageUrl
  ) {
    throw new ApiError(
      "La imagen principal es obligatoria.",
      400,
    );
  }

  if (
    publication.defaultCapacity ===
      null ||
    !Number.isInteger(
      publication.defaultCapacity,
    ) ||
    publication.defaultCapacity <=
      0
  ) {
    throw new ApiError(
      "El cupo máximo es obligatorio y debe ser mayor que cero.",
      400,
    );
  }
}

async function requireOwnedPublication(
  request: Request,
  publicationId: string,
) {
  const appSession =
    await requireAppSession(
      request,
    );

  const role =
    appSession.profile.role;

  if (
    role !== "Agencia" &&
    role !== "Transporte"
  ) {
    throw new ApiError(
      "No tienes permisos para administrar publicaciones.",
      403,
    );
  }

  const supabase =
    getSupabaseAdminClient();

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
    console.error(
      "Error consultando agencia:",
      agencyError,
    );

    throw new ApiError(
      "No se pudo consultar la agencia del usuario.",
      500,
    );
  }

  if (!agency) {
    throw new ApiError(
      "No tienes una agencia registrada.",
      404,
    );
  }

  const {
    data: publication,
    error:
      publicationError,
  } = await supabase
    .from("publications")
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
        journey,
        journey_required,
        meeting_point,
        main_image_url,
        default_capacity,
        status,
        created_at,
        updated_at
      `,
    )
    .eq(
      "id",
      publicationId,
    )
    .eq(
      "agency_id",
      agency.id,
    )
    .maybeSingle();

  if (
    publicationError
  ) {
    console.error(
      "Error consultando publicación:",
      publicationError,
    );

    throw new ApiError(
      "No se pudo consultar la publicación.",
      500,
    );
  }

  if (!publication) {
    throw new ApiError(
      "La publicación no existe.",
      404,
    );
  }

  return {
    appSession,
    agency,
    publication:
      publication as PublicationRow,
    supabase,
  };
}

async function getPublicationLanguageIds(
  supabase: ReturnType<
    typeof getSupabaseAdminClient
  >,
  publicationId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "publication_languages",
    )
    .select(
      "language_id",
    )
    .eq(
      "publication_id",
      publicationId,
    );

  if (error) {
    console.error(
      "Error consultando idiomas de publicación:",
      error,
    );

    throw new ApiError(
      "No se pudieron consultar los idiomas de la publicación.",
      500,
    );
  }

  return (
    (
      data ?? []
    ) as PublicationLanguageRow[]
  ).map(
    (row) =>
      Number(
        row.language_id,
      ),
  );
}

async function validateLanguageIds(
  supabase: ReturnType<
    typeof getSupabaseAdminClient
  >,
  languageIds: number[],
) {
  if (
    languageIds.length === 0
  ) {
    return;
  }

  const {
    data:
      validLanguages,
    error:
      languagesError,
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

  if (
    languagesError
  ) {
    console.error(
      "Error validando idiomas:",
      languagesError,
    );

    throw new ApiError(
      "No se pudieron validar los idiomas.",
      500,
    );
  }

  const validIds =
    new Set(
      (
        validLanguages ??
        []
      ).map(
        (language) =>
          Number(
            language.id,
          ),
      ),
    );

  const hasInvalid =
    languageIds.some(
      (languageId) =>
        !validIds.has(
          languageId,
        ),
    );

  if (hasInvalid) {
    throw new ApiError(
      "Uno o más idiomas seleccionados no son válidos.",
      400,
    );
  }
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const remote =
      await proxyRemoteApiRequest(
        request,
      );

    if (remote) {
      return remote;
    }

    const { id } =
      await context.params;

    const {
      publication,
      supabase,
    } =
      await requireOwnedPublication(
        request,
        id,
      );

    const languageIds =
      await getPublicationLanguageIds(
        supabase,
        publication.id,
      );

    let languages: {
      id: number;
      name: string;
      code: string;
    }[] = [];

    if (
      languageIds.length > 0
    ) {
      const {
        data:
          languageData,
        error:
          languagesError,
      } = await supabase
        .from("languages")
        .select(
          `
            id,
            name,
            code
          `,
        )
        .in(
          "id",
          languageIds,
        );

      if (
        languagesError
      ) {
        throw new ApiError(
          "No se pudieron consultar los idiomas.",
          500,
        );
      }

      languages =
        (
          languageData ??
          []
        ).map(
          (language) => ({
            id:
              Number(
                language.id,
              ),

            name:
              String(
                language.name,
              ),

            code:
              String(
                language.code,
              ),
          }),
        );
    }

    return Response.json(
      {
        data: {
          id:
            publication.id,

          agencyId:
            publication.agency_id,

          serviceType:
            publication.service_type,

          title:
            publication.title,

          description:
            publication.description,

          destination:
            publication.destination,

          pricePerPerson:
            publication.price_per_person ===
            null
              ? null
              : Number(
                  publication.price_per_person,
                ),

          durationMinutes:
            publication.duration_minutes,

          included:
            publication.included,

          notIncluded:
            publication.not_included,

          journey: publication.journey,
          journeyRequired: publication.journey_required,
          meetingPoint:
            publication.meeting_point,

          mainImageUrl:
            publication.main_image_url,

          defaultCapacity:
            publication.default_capacity,

          status:
            publication.status,

          languageIds,

          languages,

          createdAt:
            publication.created_at,

          updatedAt:
            publication.updated_at,
        },
      },
      {
        status: 200,
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

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const remote =
      await proxyRemoteApiRequest(
        request,
      );

    if (remote) {
      return remote;
    }

    assertSameOrigin(request);

    const { id } =
      await context.params;

    const {
      agency,
      publication,
      supabase,
    } =
      await requireOwnedPublication(
        request,
        id,
      );

    if (
      publication.status ===
      "INACTIVE"
    ) {
      throw new ApiError(
        "No puedes editar una publicación inactiva.",
        409,
      );
    }

    let payload:
      UpdatePublicationPayload;

    try {
      payload =
        (await request.json()) as
          UpdatePublicationPayload;
    } catch {
      throw new ApiError(
        "El cuerpo de la solicitud no es válido.",
        400,
      );
    }

    validateDraftPayload(
      payload,
    );

    const action:
      PublicationAction =
      payload.action ===
      "SUBMIT"
        ? "SUBMIT"
        : "DRAFT";

    const journeyProvided = hasOwn(payload, "journey");
    const nextJourney = parseJourney(journeyProvided ? payload.journey : publication.journey,
      action === "SUBMIT" && (publication.journey_required || !!publication.journey));
    await verifyJourney(nextJourney, publication.journey);

    const currentLanguageIds =
      await getPublicationLanguageIds(
        supabase,
        publication.id,
      );

    const languageIdsWereProvided =
      hasOwn(
        payload,
        "languageIds",
      );

    const nextLanguageIds =
      languageIdsWereProvided
        ? normalizeIds(
            payload.languageIds,
          )
        : currentLanguageIds;

    if (
      languageIdsWereProvided
    ) {
      await validateLanguageIds(
        supabase,
        nextLanguageIds,
      );
    }

    const currentState = {
      serviceType:
        publication.service_type,

      title:
        publication.title,

      description:
        publication.description,

      destination:
        publication.destination,

      pricePerPerson:
        publication.price_per_person ===
        null
          ? null
          : Number(
              publication.price_per_person,
            ),

      durationMinutes:
        publication.duration_minutes,

      included:
        publication.included,

      notIncluded:
        publication.not_included,

      meetingPoint:
        publication.meeting_point,

      mainImageUrl:
        publication.main_image_url,

      defaultCapacity:
        publication.default_capacity,

      languageIds:
        currentLanguageIds,
    };

    const nextState = {
      serviceType:
        hasOwn(
          payload,
          "serviceType",
        )
          ? cleanText(
              payload.serviceType,
            ) as ServiceType | null
          : currentState.serviceType,

      title:
        hasOwn(
          payload,
          "title",
        )
          ? cleanText(
              payload.title,
            )
          : currentState.title,

      description:
        hasOwn(
          payload,
          "description",
        )
          ? cleanText(
              payload.description,
            )
          : currentState.description,

      destination:
        hasOwn(
          payload,
          "destination",
        )
          ? cleanText(
              payload.destination,
            )
          : currentState.destination,

      pricePerPerson:
        hasOwn(
          payload,
          "pricePerPerson",
        )
          ? normalizeNumber(
              payload.pricePerPerson,
            )
          : currentState.pricePerPerson,

      durationMinutes:
        hasOwn(
          payload,
          "durationMinutes",
        )
          ? normalizeNumber(
              payload.durationMinutes,
            )
          : currentState.durationMinutes,

      included:
        hasOwn(
          payload,
          "included",
        )
          ? cleanText(
              payload.included,
            )
          : currentState.included,

      notIncluded:
        hasOwn(
          payload,
          "notIncluded",
        )
          ? cleanText(
              payload.notIncluded,
            )
          : currentState.notIncluded,

      meetingPoint:
        hasOwn(
          payload,
          "meetingPoint",
        )
          ? cleanText(
              payload.meetingPoint,
            )
          : currentState.meetingPoint,

      mainImageUrl:
        hasOwn(
          payload,
          "mainImageUrl",
        )
          ? cleanText(
              payload.mainImageUrl,
            )
          : currentState.mainImageUrl,

      defaultCapacity:
        hasOwn(
          payload,
          "defaultCapacity",
        )
          ? normalizeNumber(
              payload.defaultCapacity,
            )
          : currentState.defaultCapacity,

      languageIds:
        nextLanguageIds,
    };

    if (
      action === "SUBMIT"
    ) {
      if (
        agency.status !==
        "APPROVED"
      ) {
        throw new ApiError(
          "La agencia debe estar aprobada antes de enviar publicaciones a revisión.",
          409,
        );
      }

      validateSubmitState(
        nextState,
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    if (journeyProvided) {
      updateData.journey = nextJourney;
      if (nextJourney?.confirmedAt) updateData.journey_required = true;
    }

    if (
      hasOwn(
        payload,
        "serviceType",
      )
    ) {
      updateData.service_type =
        nextState.serviceType;
    }

    if (
      hasOwn(
        payload,
        "title",
      )
    ) {
      updateData.title =
        nextState.title;
    }

    if (
      hasOwn(
        payload,
        "description",
      )
    ) {
      updateData.description =
        nextState.description;
    }

    if (
      hasOwn(
        payload,
        "destination",
      )
    ) {
      updateData.destination =
        nextState.destination;
    }

    if (
      hasOwn(
        payload,
        "pricePerPerson",
      )
    ) {
      updateData.price_per_person =
        nextState.pricePerPerson;
    }

    if (
      hasOwn(
        payload,
        "durationMinutes",
      )
    ) {
      updateData.duration_minutes =
        nextState.durationMinutes;
    }

    if (
      hasOwn(
        payload,
        "included",
      )
    ) {
      updateData.included =
        nextState.included;
    }

    if (
      hasOwn(
        payload,
        "notIncluded",
      )
    ) {
      updateData.not_included =
        nextState.notIncluded;
    }

    if (
      hasOwn(
        payload,
        "meetingPoint",
      )
    ) {
      updateData.meeting_point =
        nextState.meetingPoint;
    }

    if (
      hasOwn(
        payload,
        "mainImageUrl",
      )
    ) {
      updateData.main_image_url =
        nextState.mainImageUrl;
    }

    if (
      hasOwn(
        payload,
        "defaultCapacity",
      )
    ) {
      updateData.default_capacity =
        nextState.defaultCapacity;
    }

    /*
     * Si se envía a revisión,
     * pasa a PENDING.
     *
     * Si solo se edita como borrador,
     * se mantiene/retorna a DRAFT.
     */
    updateData.status =
      action === "SUBMIT"
        ? "PENDING"
        : "DRAFT";

    const {
      data:
        updatedPublication,
      error:
        updateError,
    } = await supabase
      .from("publications")
      .update(
        updateData,
      )
      .eq(
        "id",
        publication.id,
      )
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
          journey,
          journey_required,
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
      updateError ||
      !updatedPublication
    ) {
      console.error(
        "Error actualizando publicación:",
        updateError,
      );

      throw new ApiError(
        "No se pudo actualizar la publicación.",
        500,
      );
    }

    /*
     * Solo reemplazamos idiomas si
     * languageIds fue enviado
     * explícitamente.
     */
    if (
      languageIdsWereProvided
    ) {
      const {
        error:
          deleteLanguagesError,
      } = await supabase
        .from(
          "publication_languages",
        )
        .delete()
        .eq(
          "publication_id",
          publication.id,
        );

      if (
        deleteLanguagesError
      ) {
        console.error(
          "Error eliminando idiomas anteriores:",
          deleteLanguagesError,
        );

        throw new ApiError(
          "No se pudieron actualizar los idiomas de la publicación.",
          500,
        );
      }

      if (
        nextLanguageIds.length >
        0
      ) {
        const rows =
          nextLanguageIds.map(
            (
              languageId,
            ) => ({
              publication_id:
                publication.id,

              language_id:
                languageId,
            }),
          );

        const {
          error:
            insertLanguagesError,
        } = await supabase
          .from(
            "publication_languages",
          )
          .insert(rows);

        if (
          insertLanguagesError
        ) {
          console.error(
            "Error insertando idiomas:",
            insertLanguagesError,
          );

          throw new ApiError(
            "No se pudieron guardar los idiomas de la publicación.",
            500,
          );
        }
      }
    }

    return Response.json(
      {
        data: {
          id:
            updatedPublication.id,

          agencyId:
            updatedPublication.agency_id,

          serviceType:
            updatedPublication.service_type,

          title:
            updatedPublication.title,

          description:
            updatedPublication.description,

          destination:
            updatedPublication.destination,

          pricePerPerson:
            updatedPublication.price_per_person ===
            null
              ? null
              : Number(
                  updatedPublication.price_per_person,
                ),

          durationMinutes:
            updatedPublication.duration_minutes,

          included:
            updatedPublication.included,

          notIncluded:
            updatedPublication.not_included,

          journey: updatedPublication.journey,
          journeyRequired: updatedPublication.journey_required,
          meetingPoint:
            updatedPublication.meeting_point,

          mainImageUrl:
            updatedPublication.main_image_url,

          defaultCapacity:
            updatedPublication.default_capacity,

          status:
            updatedPublication.status,

          languageIds:
            nextLanguageIds,

          createdAt:
            updatedPublication.created_at,

          updatedAt:
            updatedPublication.updated_at,
        },
      },
      {
        status: 200,
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

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const remote =
      await proxyRemoteApiRequest(
        request,
      );

    if (remote) {
      return remote;
    }

    assertSameOrigin(request);

    const { id } =
      await context.params;

    const {
      publication,
      supabase,
    } =
      await requireOwnedPublication(
        request,
        id,
      );

    /*
     * Desactivación idempotente.
     */
    if (
      publication.status ===
      "INACTIVE"
    ) {
      return Response.json(
        {
          data: {
            id:
              publication.id,

            status:
              "INACTIVE",
          },
        },
        {
          status: 200,
          headers: {
            "cache-control":
              "no-store",
          },
        },
      );
    }

    const {
      data:
        updatedPublication,
      error:
        updateError,
    } = await supabase
      .from("publications")
      .update({
        status:
          "INACTIVE",
      })
      .eq(
        "id",
        publication.id,
      )
      .select(
        `
          id,
          status
        `,
      )
      .single();

    if (
      updateError ||
      !updatedPublication
    ) {
      console.error(
        "Error desactivando publicación:",
        updateError,
      );

      throw new ApiError(
        "No se pudo desactivar la publicación.",
        500,
      );
    }

    return Response.json(
      {
        data:
          updatedPublication,
      },
      {
        status: 200,
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