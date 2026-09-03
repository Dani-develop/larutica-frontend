import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { authErrorMessage, createPasswordAuthClient, discardSupabaseSession } from "@/lib/supabase/server-auth";
import { createAppSession, jsonWithSession, sessionPayload } from "@/lib/supabase/session";
import { signInValidators } from "@/modules/auth/validators/authValidators";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const parsed = signInValidators.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

    const { data, error } = await createPasswordAuthClient().auth.signInWithPassword({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
    });
    if (error || !data.session || !data.user) {
      throw new ApiError(authErrorMessage(error ?? "No se pudo iniciar sesión."), 401);
    }

    try {
      const appSession = await createAppSession(data.user.id);
      return jsonWithSession(
        sessionPayload(appSession.session, appSession.profile),
        appSession.opaqueToken,
      );
    } finally {
      await discardSupabaseSession(data.session);
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
