import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { preparePasswordChange } from "@/lib/auth/password-reset";
import { consumeResetGrant, findResetGrant } from "@/lib/auth/password-reset-store";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createAppSession, jsonWithSession, sessionPayload } from "@/lib/supabase/session";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const body = await request.json() as {
      resetGrant?: unknown;
      password?: unknown;
      confirmation?: unknown;
    };
    const resetGrant = String(body.resetGrant ?? "");
    const password = String(body.password ?? "");
    const confirmation = String(body.confirmation ?? "");
    const decision = preparePasswordChange(
      await findResetGrant(resetGrant),
      password,
      confirmation,
      Date.now(),
    );
    if (!decision.ok) throw new ApiError(decision.message, 400);

    const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(decision.userId, { password });
    if (error) throw new ApiError(error.message, 400);

    const appSession = await createAppSession(decision.userId);
    const response = jsonWithSession(
      sessionPayload(appSession.session, appSession.profile),
      appSession.opaqueToken,
    );
    try {
      await consumeResetGrant(resetGrant);
    } catch {
      console.error("No se pudo consumir el permiso de recuperación.");
    }
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
