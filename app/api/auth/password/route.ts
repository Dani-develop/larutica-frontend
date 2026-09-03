import { NextResponse } from "next/server";
import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import {
  clearSessionCookies,
  createAppSession,
  jsonWithSession,
  requireAppSession,
  sessionPayload,
} from "@/lib/supabase/session";

export async function PATCH(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const current = await requireAppSession(request);
    const body = await request.json() as { password?: unknown };
    const password = String(body.password ?? "");
    if (password.length < 8 || password.length > 128) {
      throw new ApiError("La contraseña debe tener entre 8 y 128 caracteres.", 400);
    }

    const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(
      current.session.userId,
      { password },
    );
    if (error) throw new ApiError(error.message, 400);

    const replacement = await createAppSession(current.session.userId);
    return jsonWithSession(
      sessionPayload(replacement.session, replacement.profile),
      replacement.opaqueToken,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return clearSessionCookies(NextResponse.json(
        { error: error.message },
        { status: 401, headers: { "cache-control": "no-store" } },
      ));
    }
    return apiErrorResponse(error);
  }
}
