import { NextResponse } from "next/server";
import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import {
  authErrorMessage,
  createPasswordAuthClient,
  discardSupabaseSession,
} from "@/lib/supabase/server-auth";
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
    const body = (await request.json()) as {
      password?: unknown;
      currentPassword?: unknown;
    };
    const password = String(body.password ?? "");
    const requiresCurrentPassword = Object.prototype.hasOwnProperty.call(
      body,
      "currentPassword",
    );

    if (password.length < 8 || password.length > 128) {
      throw new ApiError("La contraseña debe tener entre 8 y 128 caracteres.", 400);
    }

    if (requiresCurrentPassword) {
      const currentPassword = String(body.currentPassword ?? "");
      if (!currentPassword) {
        throw new ApiError("Escribe tu contraseña actual.", 400);
      }
      if (currentPassword === password) {
        throw new ApiError(
          "La nueva contraseña debe ser distinta a la actual.",
          400,
        );
      }

      const email = current.profile.email?.trim().toLowerCase();
      if (!email) {
        throw new ApiError("No se encontró el correo de la cuenta.", 400);
      }

      const authClient = createPasswordAuthClient();
      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (error || !data.user) {
        throw new ApiError(
          /invalid login credentials/i.test(String(error?.message ?? ""))
            ? "La contraseña actual no es correcta."
            : authErrorMessage(error ?? "No se pudo verificar la contraseña."),
          400,
        );
      }
      await discardSupabaseSession(data.session);
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
