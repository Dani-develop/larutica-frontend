import {
  AdminApiError,
  adminErrorResponse,
  requireAdmin,
} from "@/lib/supabase/admin";

import {
  proxyRemoteApiRequest,
} from "@/lib/api/remote-proxy";

const DOCUMENT_BUCKET =
  "agency-documents";

const SIGNED_URL_SECONDS =
  300;

function getAgencyId(
  request: Request,
): string {
  const parts =
    new URL(request.url)
      .pathname
      .split("/")
      .filter(Boolean);

  const documentIndex =
    parts.lastIndexOf(
      "verification-document",
    );

  const id =
    documentIndex > 0
      ? parts[
          documentIndex -
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
        .select(
          "id,verification_document_url",
        )
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

    const documentPath =
      agency.verification_document_url;

    if (!documentPath) {
      throw new AdminApiError(
        "La agencia no tiene un documento de verificación.",
        404,
      );
    }

    const {
      data,
      error,
    } =
      await admin.storage
        .from(
          DOCUMENT_BUCKET,
        )
        .createSignedUrl(
          documentPath,
          SIGNED_URL_SECONDS,
        );

    if (
      error ||
      !data?.signedUrl
    ) {
      throw (
        error ??
        new Error(
          "No se pudo generar el acceso temporal al documento.",
        )
      );
    }

    return Response.json(
      {
        data: {
          url:
            data.signedUrl,

          expiresIn:
            SIGNED_URL_SECONDS,
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