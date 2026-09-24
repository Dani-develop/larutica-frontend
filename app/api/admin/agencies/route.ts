import {
  adminErrorResponse,
  requireAdmin,
} from "@/lib/supabase/admin";

import {
  proxyRemoteApiRequest,
} from "@/lib/api/remote-proxy";

const VALID_STATUSES = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "INACTIVE",
] as const;

type AgencyStatus =
  (typeof VALID_STATUSES)[number];

function isAgencyStatus(
  value: string | null,
): value is AgencyStatus {
  return (
    value !== null &&
    VALID_STATUSES.includes(
      value as AgencyStatus,
    )
  );
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

    const url =
      new URL(
        request.url,
      );

    const status =
      url.searchParams.get(
        "status",
      );

    const search =
      url.searchParams
        .get("search")
        ?.trim();

    let query =
      admin
        .from(
          "agencies",
        )
        .select(`
          *,
          agency_service_categories (
            category_id,
            service_categories (
              id,
              name,
              active
            )
          ),
          agency_languages (
            language_id,
            languages (
              id,
              name,
              code,
              active
            )
          )
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (
      isAgencyStatus(
        status,
      )
    ) {
      query =
        query.eq(
          "status",
          status,
        );
    }

    if (
      search
    ) {
      query =
        query.or(
          `agency_name.ilike.%${search}%,commercial_name.ilike.%${search}%,email.ilike.%${search}%`,
        );
    }

    const {
      data,
      error,
    } =
      await query;

    if (
      error
    ) {
      throw error;
    }

    return Response.json(
      {
        data:
          data ?? [],
      },
      {
        status:
          200,

        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    return adminErrorResponse(
      error,
    );
  }
}