import {
  AdminApiError,
  adminErrorResponse,
  requireAdmin,
} from "@/lib/supabase/admin";

import {
  proxyRemoteApiRequest,
} from "@/lib/api/remote-proxy";

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

  const id =
    parts.at(
      -1,
    );

  if (!id) {
    throw new AdminApiError(
      "El identificador de la publicación no es válido.",
      400,
    );
  }

  return id;
}

export async function GET(
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

    const {
      data:
        publication,
      error:
        publicationError,
    } =
      await admin
        .from(
          "publications",
        )
        .select(`
          *,
          agencies (
            id,
            agency_name,
            commercial_name,
            logo_url,
            status
          )
        `)
        .eq(
          "id",
          publicationId,
        )
        .maybeSingle();

    if (
      publicationError
    ) {
      throw publicationError;
    }

    if (
      !publication
    ) {
      throw new AdminApiError(
        "La publicación no existe.",
        404,
      );
    }

    const {
      data:
        languages,
      error:
        languagesError,
    } =
      await admin
        .from(
          "publication_languages",
        )
        .select(`
          language_id,
          languages (
            id,
            name,
            code,
            active
          )
        `)
        .eq(
          "publication_id",
          publication.id,
        );

    if (
      languagesError
    ) {
      throw languagesError;
    }

    const {
      data:
        departures,
      error:
        departuresError,
    } =
      await admin
        .from(
          "publication_departures",
        )
        .select("*")
        .eq(
          "publication_id",
          publication.id,
        )
        .order(
          "start_at",
          {
            ascending:
              true,
          },
        );

    if (
      departuresError
    ) {
      throw departuresError;
    }

    return Response.json(
      {
        data: {
          publication,

          languages:
            languages ??
            [],

          departures:
            departures ??
            [],
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
    return adminErrorResponse(
      error,
    );
  }
}