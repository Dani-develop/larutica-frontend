import {
  AdminApiError,
  adminErrorResponse,
  requireAdmin,
} from "@/lib/supabase/admin";

import {
  assertSameOrigin,
} from "@/lib/api/errors";

import {
  proxyRemoteApiRequest,
} from "@/lib/api/remote-proxy";

type ReviewStatus =
  | "APPROVED"
  | "REJECTED";

function getAgencyId(
  request: Request,
): string {
  const parts =
    new URL(request.url)
      .pathname
      .split("/")
      .filter(Boolean);

  const statusIndex =
    parts.lastIndexOf(
      "status",
    );

  const id =
    statusIndex > 0
      ? parts[
          statusIndex -
            1
        ]
      : null;

  if (!id) {
    throw new AdminApiError(
      "El identificador de la agencia no es válido.",
      400,
    );
  }

  return id;
}

function parseStatus(
  value: unknown,
): ReviewStatus {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    throw new AdminApiError(
      "Los datos de revisión no son válidos.",
      400,
    );
  }

  const body =
    value as Record<
      string,
      unknown
    >;

  const status =
    String(
      body.status ??
        "",
    );

  if (
    status !==
      "APPROVED" &&
    status !==
      "REJECTED"
  ) {
    throw new AdminApiError(
      "El estado de revisión debe ser APPROVED o REJECTED.",
      400,
    );
  }

  return status;
}

export async function PATCH(
  request: Request,
) {
  const remote =
    await proxyRemoteApiRequest(
      request,
    );

  if (remote) {
    return remote;
  }

  try {
    assertSameOrigin(
      request,
    );

    const {
      admin,
    } =
      await requireAdmin(
        request,
      );

    const agencyId =
      getAgencyId(
        request,
      );

    const status =
      parseStatus(
        await request.json(),
      );

    const {
      data: existingAgency,
      error: existingError,
    } =
      await admin
        .from(
          "agencies",
        )
        .select(
          "id,status",
        )
        .eq(
          "id",
          agencyId,
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingAgency) {
      throw new AdminApiError(
        "La agencia no existe.",
        404,
      );
    }

    if (
      existingAgency.status !==
      "PENDING"
    ) {
      throw new AdminApiError(
        "Solo pueden aprobarse o rechazarse agencias que estén en revisión.",
        409,
      );
    }

    const {
      data: agency,
      error: updateError,
    } =
      await admin
        .from(
          "agencies",
        )
        .update({
          status,
        })
        .eq(
          "id",
          agencyId,
        )
        .select("*")
        .single();

    if (
      updateError ||
      !agency
    ) {
      throw (
        updateError ??
        new Error(
          "No se pudo actualizar el estado de la agencia.",
        )
      );
    }

    return Response.json(
      {
        data: agency,
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
    return adminErrorResponse(
      error,
    );
  }
}