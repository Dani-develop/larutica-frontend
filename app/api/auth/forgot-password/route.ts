import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { clientUrl } from "@/lib/api/request-origin";
import { authErrorMessage, createPkceAuthClient } from "@/lib/supabase/server-auth";
import { createOpaqueToken, storePkceFlow } from "@/lib/supabase/session";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const body = await request.json() as { email?: unknown };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError("Ingresa un correo válido.", 400);

    const flow = createOpaqueToken();
    const callback = clientUrl("/api/auth/callback", request);
    callback.searchParams.set("flow", flow);
    const { client, storage } = createPkceAuthClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: callback.toString(),
    });
    if (error) throw new ApiError(authErrorMessage(error), error.status === 429 ? 429 : 400);

    const verifier = storage.getCodeVerifier();
    if (!verifier) throw new ApiError("No se pudo preparar la recuperación segura.", 500);
    await storePkceFlow(flow, verifier, "recovery");
    return Response.json({ data: null }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
