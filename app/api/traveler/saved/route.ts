import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { listTravelerPublications } from "@/lib/traveler/publications";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireTraveler(request: Request) {
  const appSession = await requireAppSession(request);
  if (appSession.profile.role !== "Viajero" || appSession.profile.status !== "Activo") {
    throw new ApiError("Solo los viajeros pueden administrar sus publicaciones guardadas.", 403);
  }
  return appSession;
}

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { session } = await requireTraveler(request);
    const admin = getSupabaseAdminClient();
    const { data: savedRows, error } = await admin
      .from("saved_publications")
      .select("publication_id, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const publicationIds = (savedRows ?? []).map((row) => row.publication_id);
    const publications = await listTravelerPublications(admin, publicationIds);
    const savedOrder = new Map(publicationIds.map((id, index) => [id, index]));
    publications.sort((left, right) =>
      (savedOrder.get(left.id) ?? 0) - (savedOrder.get(right.id) ?? 0),
    );

    return Response.json(
      { data: publications },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { session } = await requireTraveler(request);
    const body: unknown = await request.json();
    if (
      typeof body !== "object"
      || body === null
      || !("publicationId" in body)
      || typeof body.publicationId !== "string"
      || !UUID_PATTERN.test(body.publicationId)
    ) {
      throw new ApiError("La publicación seleccionada no es válida.", 400);
    }

    const admin = getSupabaseAdminClient();
    const { data: publication, error: publicationError } = await admin
      .from("publications")
      .select("id, agency_id")
      .eq("id", body.publicationId)
      .eq("status", "APPROVED")
      .maybeSingle();
    if (publicationError) throw publicationError;
    if (!publication) throw new ApiError("La publicación no está disponible.", 404);
    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .select("id")
      .eq("id", publication.agency_id)
      .eq("status", "APPROVED")
      .maybeSingle();
    if (agencyError) throw agencyError;
    if (!agency) throw new ApiError("La publicación no está disponible.", 404);

    const { error } = await admin.from("saved_publications").upsert(
      { user_id: session.userId, publication_id: body.publicationId },
      { onConflict: "user_id,publication_id", ignoreDuplicates: true },
    );
    if (error) throw error;

    return Response.json(
      { data: { publicationId: body.publicationId, saved: true } },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
