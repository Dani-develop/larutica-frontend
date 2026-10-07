import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";

type RouteContext = { params: Promise<{ publicationId: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { session, profile } = await requireAppSession(request);
    if (profile.role !== "Viajero" || profile.status !== "Activo") {
      throw new ApiError("Solo los viajeros pueden administrar sus publicaciones guardadas.", 403);
    }
    const { publicationId } = await context.params;
    if (!UUID_PATTERN.test(publicationId)) {
      throw new ApiError("La publicación seleccionada no es válida.", 400);
    }

    const { error } = await getSupabaseAdminClient()
      .from("saved_publications")
      .delete()
      .eq("user_id", session.userId)
      .eq("publication_id", publicationId);
    if (error) throw error;

    return Response.json(
      { data: { publicationId, saved: false } },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
