import {
  ApiError,
  apiErrorResponse,
  assertSameOrigin,
} from "@/lib/api/errors";

import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

import { notifyDepartureCancellations } from "@/lib/mail/notify";

import { applyDepartureCancellation } from "@/lib/reservations/departure-cancel";

import { cancelDepartureReservations } from "@/lib/reservations/repository";

import { requireAppSession } from "@/lib/supabase/session";

type RouteContext = {
  params: Promise<{
    id: string;
    departureId: string;
  }>;
};

type DepartureStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "COMPLETED";

type UpdateDeparturePayload = {
  startAt?: string;
  endAt?: string | null;
  capacity?: number | null;
  status?: DepartureStatus;
};

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

function normalizeCapacity(
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

  if (
    !Number.isInteger(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function validateDate(
  value: string,
): boolean {
  return !Number.isNaN(
    Date.parse(value),
  );
}

async function requireOwnedDeparture(
  request: Request,
  publicationId: string,
  departureId: string,
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
      "No tienes permisos para administrar salidas.",
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

  if (
    agency.status === "INACTIVE"
  ) {
    throw new ApiError(
      "La agencia está inactiva.",
      409,
    );
  }

  const {
    data: publication,
    error: publicationError,
  } = await supabase
    .from("publications")
    .select(
      `
        id,
        agency_id,
        status
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

  if (publicationError) {
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

  const {
    data: departure,
    error: departureError,
  } = await supabase
    .from(
      "publication_departures",
    )
    .select(
      `
        id,
        publication_id,
        start_at,
        end_at,
        capacity,
        status,
        created_at,
        updated_at
      `,
    )
    .eq(
      "id",
      departureId,
    )
    .eq(
      "publication_id",
      publication.id,
    )
    .maybeSingle();

  if (departureError) {
    console.error(
      "Error consultando salida:",
      departureError,
    );

    throw new ApiError(
      "No se pudo consultar la salida.",
      500,
    );
  }

  if (!departure) {
    throw new ApiError(
      "La salida no existe.",
      404,
    );
  }

  return {
    publication,
    departure,
    supabase,
  };
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

    const {
      id,
      departureId,
    } = await context.params;

    const {
      publication,
      departure,
      supabase,
    } =
      await requireOwnedDeparture(
        request,
        id,
        departureId,
      );

    if (
      publication.status ===
      "INACTIVE"
    ) {
      throw new ApiError(
        "No puedes editar salidas de una publicación inactiva.",
        409,
      );
    }

    if (
      departure.status ===
      "CANCELLED"
    ) {
      throw new ApiError(
        "No puedes editar una salida cancelada.",
        409,
      );
    }

    let payload:
      UpdateDeparturePayload;

    try {
      payload =
        (await request.json()) as
          UpdateDeparturePayload;
    } catch {
      throw new ApiError(
        "El cuerpo de la solicitud no es válido.",
        400,
      );
    }

    const startAt =
      payload.startAt ===
      undefined
        ? departure.start_at
        : cleanText(
            payload.startAt,
          );

    const endAt =
      payload.endAt ===
      undefined
        ? departure.end_at
        : cleanText(
            payload.endAt,
          );

    const capacity =
      payload.capacity ===
      undefined
        ? departure.capacity
        : normalizeCapacity(
            payload.capacity,
          );

    const status =
      payload.status ??
      departure.status;

    if (!startAt) {
      throw new ApiError(
        "La fecha y hora de inicio son obligatorias.",
        400,
      );
    }

    if (
      !validateDate(startAt)
    ) {
      throw new ApiError(
        "La fecha de inicio no es válida.",
        400,
      );
    }

    if (
      endAt &&
      !validateDate(endAt)
    ) {
      throw new ApiError(
        "La fecha de finalización no es válida.",
        400,
      );
    }

    if (
      endAt &&
      Date.parse(endAt) <=
        Date.parse(startAt)
    ) {
      throw new ApiError(
        "La fecha de finalización debe ser posterior a la fecha de inicio.",
        400,
      );
    }

    if (!capacity) {
      throw new ApiError(
        "La capacidad debe ser mayor que cero.",
        400,
      );
    }

    if (
      ![
        "ACTIVE",
        "CANCELLED",
        "COMPLETED",
      ].includes(status)
    ) {
      throw new ApiError(
        "El estado de la salida no es válido.",
        400,
      );
    }

    /*
     * Evitar duplicar fecha/hora
     * dentro de la misma publicación.
     */
    const {
      data:
        duplicateDeparture,
      error:
        duplicateError,
    } = await supabase
      .from(
        "publication_departures",
      )
      .select("id")
      .eq(
        "publication_id",
        publication.id,
      )
      .eq(
        "start_at",
        startAt,
      )
      .neq(
        "id",
        departure.id,
      )
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Error verificando salida duplicada:",
        duplicateError,
      );

      throw new ApiError(
        "No se pudo validar la fecha de la salida.",
        500,
      );
    }

    if (
      duplicateDeparture
    ) {
      throw new ApiError(
        "Ya existe otra salida para esta publicación en la misma fecha y hora.",
        409,
      );
    }

    const cancelledReservations =
      await applyDepartureCancellation(
        departure.status,
        status,
        () =>
          cancelDepartureReservations(
            supabase,
            departure.id,
          ),
      );

    const {
      data:
        updatedDeparture,
      error:
        updateError,
    } = await supabase
      .from(
        "publication_departures",
      )
      .update({
        start_at:
          startAt,

        end_at:
          endAt,

        capacity,

        status,
      })
      .eq(
        "id",
        departure.id,
      )
      .select(
        `
          id,
          publication_id,
          start_at,
          end_at,
          capacity,
          status,
          created_at,
          updated_at
        `,
      )
      .single();

    if (
      updateError ||
      !updatedDeparture
    ) {
      console.error(
        "Error actualizando salida:",
        updateError,
      );

      throw new ApiError(
        "No se pudo actualizar la salida.",
        500,
      );
    }

    await notifyDepartureCancellations(
      cancelledReservations,
    );

    return Response.json(
      {
        data: {
          id:
            updatedDeparture.id,

          publicationId:
            updatedDeparture.publication_id,

          startAt:
            updatedDeparture.start_at,

          endAt:
            updatedDeparture.end_at,

          capacity:
            updatedDeparture.capacity,

          status:
            updatedDeparture.status,

          createdAt:
            updatedDeparture.created_at,

          updatedAt:
            updatedDeparture.updated_at,
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

    const {
      id,
      departureId,
    } = await context.params;

    const {
      departure,
      supabase,
    } =
      await requireOwnedDeparture(
        request,
        id,
        departureId,
      );

    /*
     * La cancelación es idempotente:
     * si ya estaba cancelada,
     * simplemente devolvemos el estado.
     */
    if (
      departure.status ===
      "CANCELLED"
    ) {
      return Response.json(
        {
          data: {
            id:
              departure.id,

            status:
              "CANCELLED",
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

    const cancelledReservations =
      await applyDepartureCancellation(
        departure.status,
        "CANCELLED",
        () =>
          cancelDepartureReservations(
            supabase,
            departure.id,
          ),
      );

    await notifyDepartureCancellations(
      cancelledReservations,
    );

    const {
      data:
        cancelledDeparture,
      error:
        cancelError,
    } = await supabase
      .from(
        "publication_departures",
      )
      .select(
        `
          id,
          publication_id,
          start_at,
          end_at,
          capacity,
          status,
          created_at,
          updated_at
        `,
      )
      .eq(
        "id",
        departure.id,
      )
      .single();

    if (
      cancelError ||
      !cancelledDeparture
    ) {
      console.error(
        "Error cancelando salida:",
        cancelError,
      );

      throw new ApiError(
        "No se pudo cancelar la salida.",
        500,
      );
    }

    return Response.json(
      {
        data: {
          id:
            cancelledDeparture.id,

          publicationId:
            cancelledDeparture.publication_id,

          startAt:
            cancelledDeparture.start_at,

          endAt:
            cancelledDeparture.end_at,

          capacity:
            cancelledDeparture.capacity,

          status:
            cancelledDeparture.status,

          createdAt:
            cancelledDeparture.created_at,

          updatedAt:
            cancelledDeparture.updated_at,
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