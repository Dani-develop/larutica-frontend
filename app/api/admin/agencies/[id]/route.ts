import {
  AdminApiError,
  adminErrorResponse,
  requireAdmin,
} from "@/lib/supabase/admin";

import {
  proxyRemoteApiRequest,
} from "@/lib/api/remote-proxy";

function getAgencyId(
  request: Request,
): string {
  const parts =
    new URL(request.url)
      .pathname
      .split("/")
      .filter(Boolean);

  const id =
    parts.at(-1);

  if (!id) {
    throw new AdminApiError(
      "El identificador de la agencia no es válido.",
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

    const agencyId =
      getAgencyId(
        request,
      );

    const {
      data: agency,
      error: agencyError,
    } =
      await admin
        .from(
          "agencies",
        )
        .select("*")
        .eq(
          "id",
          agencyId,
        )
        .maybeSingle();

    if (agencyError) {
      throw agencyError;
    }

    if (!agency) {
      throw new AdminApiError(
        "La agencia no existe.",
        404,
      );
    }

    const {
      data: categories,
      error: categoriesError,
    } =
      await admin
        .from(
          "agency_service_categories",
        )
        .select(`
          category_id,
          service_categories (
            id,
            name,
            active
          )
        `)
        .eq(
          "agency_id",
          agency.id,
        );

    if (categoriesError) {
      throw categoriesError;
    }

    const {
      data: languages,
      error: languagesError,
    } =
      await admin
        .from(
          "agency_languages",
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
          "agency_id",
          agency.id,
        );

    if (languagesError) {
      throw languagesError;
    }

    return Response.json(
      {
        data: {
          agency,
          categories:
            categories ??
            [],
          languages:
            languages ??
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