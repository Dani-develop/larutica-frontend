import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { profileRowToSystemUser, type ProfileRow } from "@/lib/supabase/profiles";
import { requireAppSession } from "@/lib/supabase/session";

export async function PATCH(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const businessName = String(body.businessName ?? "").trim();
    if (name.length < 2 || name.length > 120 || phone.length > 30 || businessName.length > 160) {
      throw new ApiError("Los datos del perfil no son válidos.", 400);
    }

    const admin = getSupabaseAdminClient();
    const { error: metadataError } = await admin.auth.admin.updateUserById(
      appSession.session.userId,
      { user_metadata: { full_name: name, phone, business_name: businessName } },
    );
    if (metadataError) throw new ApiError(metadataError.message, 400);

    const { data, error } = await admin
      .from("profiles")
      .update({
        full_name: name,
        phone: phone || null,
        business_name: businessName || null,
      })
      .eq("id", appSession.session.userId)
      .select("*")
      .single();
    if (error || !data) throw error ?? new ApiError("No se pudo actualizar el perfil.", 500);
    return Response.json(
      { data: profileRowToSystemUser(data as ProfileRow) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
