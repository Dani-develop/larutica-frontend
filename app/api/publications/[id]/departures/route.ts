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

type CreateDeparturePayload = {
  startAt?: string;
  endAt?: string | null;
  capacity?: number | null;
};

type DepartureRow = {
  id: string;
  publication_id: string;
  start_at: string;
  end_at: string | null;
  capacity: number;
  status:
    | "ACTIVE"
    | "CANCELLED"
    | "COMPLETED";
  created_at: string;
  updated_at: string;
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
      "No tienes permisos para administrar salidas.",
      403,
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const userId =
    appSession.session.userId;

  /*
   * Obtener la agencia asociada
   * al usuario autenticado.
   */
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

  /*
   * Buscar la publicación comprobando
   * además que pertenezca a esa agencia.
   */
  const {
    data: publication,
    error: publicationError,
  } = await supabase
    .from("publications")
    .select(
      `
        id,
        agency_id,
        title,
        default_capacity,
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

  return {
    agency,
    publication,
    supabase,
  };
}

/*
 * GET /api/publications/:id/departures
 *
 * Lista todas las salidas pertenecientes
 * a una publicación del proveedor.
 */
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

    const {
      data: departures,
      error: departuresError,
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
        "publication_id",
        publication.id,
      )
      .order(
        "start_at",
        {
          ascending: true,
        },
      );

    if (departuresError) {
      console.error(
        "Error consultando salidas:",
        departuresError,
      );

      throw new ApiError(
        "No se pudieron consultar las salidas.",
        500,
      );
    }

    const rows =
      (
        departures ??
        []
      ) as DepartureRow[];

    const responseData =
      rows.map(
        (departure) => ({
          id:
            departure.id,

          publicationId:
            departure.publication_id,

          startAt:
            departure.start_at,

          endAt:
            departure.end_at,

          capacity:
            departure.capacity,

          status:
            departure.status,

          createdAt:
            departure.created_at,

          updatedAt:
            departure.updated_at,
        }),
      );

    return Response.json(
      {
        data:
          responseData,
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

/*
 * POST /api/publications/:id/departures
 *
 * Crea una nueva fecha/salida para
 * la publicación.
 */
export async function POST(
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

    if (
      publication.status ===
      "INACTIVE"
    ) {
      throw new ApiError(
        "No puedes agregar salidas a una publicación inactiva.",
        409,
      );
    }

    let payload:
      CreateDeparturePayload;

    try {
      payload =
        (await request.json()) as
          CreateDeparturePayload;
    } catch {
      throw new ApiError(
        "El cuerpo de la solicitud no es válido.",
        400,
      );
    }

    const startAt =
      cleanText(
        payload.startAt,
      );

    const endAt =
      cleanText(
        payload.endAt,
      );

    /*
     * Si no se especifica capacidad,
     * usamos la capacidad predeterminada
     * de la publicación.
     */
    const requestedCapacity =
      normalizeCapacity(
        payload.capacity,
      );

    const defaultCapacity =
      normalizeCapacity(
        publication.default_capacity,
      );

    const capacity =
      requestedCapacity ??
      defaultCapacity;

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
        "Debes indicar una capacidad válida para la salida.",
        400,
      );
    }

    /*
     * La base también posee una
     * restricción UNIQUE, pero hacemos
     * esta comprobación para devolver
     * un mensaje más claro.
     */
    const {
      data:
        existingDeparture,
      error:
        existingDepartureError,
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
      .maybeSingle();

    if (
      existingDepartureError
    ) {
      console.error(
        "Error verificando salida existente:",
        existingDepartureError,
      );

      throw new ApiError(
        "No se pudo validar la fecha de la salida.",
        500,
      );
    }

    if (
      existingDeparture
    ) {
      throw new ApiError(
        "Ya existe una salida para esta publicación en la misma fecha y hora.",
        409,
      );
    }

    const {
      data: departure,
      error: departureError,
    } = await supabase
      .from(
        "publication_departures",
      )
      .insert({
        publication_id:
          publication.id,

        start_at:
          startAt,

        end_at:
          endAt,

        capacity,

        status:
          "ACTIVE",
      })
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
      departureError ||
      !departure
    ) {
      console.error(
        "Error creando salida:",
        departureError,
      );

      throw new ApiError(
        "No se pudo crear la salida.",
        500,
      );
    }

    return Response.json(
      {
        data: {
          id:
            departure.id,

          publicationId:
            departure.publication_id,

          startAt:
            departure.start_at,

          endAt:
            departure.end_at,

          capacity:
            departure.capacity,

          status:
            departure.status,

          createdAt:
            departure.created_at,

          updatedAt:
            departure.updated_at,
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