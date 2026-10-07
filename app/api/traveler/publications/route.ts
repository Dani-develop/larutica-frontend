import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { listTravelerPublications } from "@/lib/traveler/publications";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { profile } = await requireAppSession(request);
    if (profile.role !== "Viajero" || profile.status !== "Activo") {
      throw new ApiError("Solo los viajeros pueden explorar publicaciones.", 403);
    }
    const search = new URL(request.url).searchParams;
    const publicationId = search.get("id");
    if (publicationId && !UUID_PATTERN.test(publicationId)) {
      throw new ApiError("La publicación seleccionada no es válida.", 400);
    }
    const provider = search.get("provider");
    const publications = await listTravelerPublications(
      getSupabaseAdminClient(),
      publicationId ? [publicationId] : undefined,
    );
    if (publicationId && publications.length === 0) {
      throw new ApiError("La publicación no está disponible.", 404);
    }
    const visiblePublications = provider
      ? publications.filter((publication) => publication.providerSlug === provider)
      : publications;
    return Response.json(
      { data: visiblePublications },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
