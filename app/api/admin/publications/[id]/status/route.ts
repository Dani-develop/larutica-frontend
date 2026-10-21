import { journeyReady, type Journey } from "@/modules/journeys/types";
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

import {
  notifyPublicationDecision,
} from "@/lib/mail/notify";

type ReviewStatus =
  | "APPROVED"
  | "REJECTED";

function getPublicationId(
  request: Request,
): string {
  const parts =
    new URL(
      request.url,
    )
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
      "El identificador de la publicación no es válido.",
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
      "El estado debe ser APPROVED o REJECTED.",
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

    const publicationId =
      getPublicationId(
        request,
      );

    const status =
      parseStatus(
        await request.json(),
      );

    const {
      data:
        existingPublication,
      error:
        existingError,
    } =
      await admin
        .from(
          "publications",
        )
        .select(
          "id,status,agency_id,journey,journey_required",
        )
        .eq(
          "id",
          publicationId,
        )
        .maybeSingle();

    if (
      existingError
    ) {
      throw existingError;
    }

    if (
      !existingPublication
    ) {
      throw new AdminApiError(
        "La publicación no existe.",
        404,
      );
    }

    if (status === "APPROVED" && existingPublication.journey_required && !journeyReady(existingPublication.journey as Journey | null)) {
      throw new AdminApiError("El publicador debe definir y confirmar el trayecto antes de aprobar la actividad.", 409);
    }

    if (
      existingPublication.status !==
      "PENDING"
    ) {
      throw new AdminApiError(
        "Solo pueden aprobarse o rechazarse publicaciones que estén en revisión.",
        409,
      );
    }

    if (
      status ===
      "APPROVED"
    ) {
      const {
        data: agency,
        error:
          agencyError,
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
            existingPublication.agency_id,
          )
          .maybeSingle();

      if (
        agencyError
      ) {
        throw agencyError;
      }

      if (
        !agency
      ) {
        throw new AdminApiError(
          "No se encontró la agencia asociada.",
          404,
        );
      }

      if (
        agency.status !==
        "APPROVED"
      ) {
        throw new AdminApiError(
          "La agencia debe estar aprobada antes de aprobar una publicación.",
          409,
        );
      }
    }

    const {
      data:
        publication,
      error:
        updateError,
    } =
      await admin
        .from(
          "publications",
        )
        .update({
          status,
        })
        .eq(
          "id",
          publicationId,
        )
        .select("*")
        .single();

    if (
      updateError ||
      !publication
    ) {
      throw (
        updateError ??
        new Error(
          "No se pudo actualizar la publicación.",
        )
      );
    }

    const {
      data:
        agencyContact,
      error:
        contactError,
    } =
      await admin
        .from(
          "agencies",
        )
        .select(
          "email",
        )
        .eq(
          "id",
          publication.agency_id,
        )
        .maybeSingle();

    if (contactError) {
      console.error(
        "No se pudo leer el correo de la agencia.",
        contactError,
      );
    } else {
      await notifyPublicationDecision(
        {
          previousStatus:
            existingPublication.status,
          status,
          title:
            String(
              publication.title ??
                "Publicación",
            ),
          agencyEmail:
            agencyContact?.email ??
            null,
        },
      );
    }

    return Response.json(
      {
        data:
          publication,
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