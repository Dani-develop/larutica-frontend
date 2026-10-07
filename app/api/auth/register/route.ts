import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { clientUrl } from "@/lib/api/request-origin";
import { authErrorMessage, createPkceAuthClient, discardSupabaseSession } from "@/lib/supabase/server-auth";
import {
  createAppSession,
  createOpaqueToken,
  jsonWithSession,
  sessionPayload,
  storePkceFlow,
} from "@/lib/supabase/session";
import { signUpValidators } from "@/modules/auth/validators/authValidators";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacyPolicy";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = signUpValidators.safeParse(await request.clone().json());
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

    const remote = await proxyRemoteApiRequest(request);
    if (remote) return remote;

    const flow = createOpaqueToken();
    const callback = clientUrl("/api/auth/callback", request);
    callback.searchParams.set("flow", flow);
    const { client, storage } = createPkceAuthClient();
    const { data, error } = await client.auth.signUp({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      options: {
        emailRedirectTo: callback.toString(),
        data: {
          full_name: parsed.data.fullName.trim(),
          role: parsed.data.role,
          phone: parsed.data.phone.trim(),
          business_name: parsed.data.companyName.trim(),
          privacy_policy_accepted_at: new Date().toISOString(),
          privacy_policy_version: PRIVACY_POLICY_VERSION,
        },
      },
    });
    if (error || !data.user) {
      throw new ApiError(authErrorMessage(error ?? "No se pudo crear la cuenta."), 400);
    }

    if (data.session) {
      try {
        const appSession = await createAppSession(data.user.id);
        return jsonWithSession(
          {
            ...sessionPayload(appSession.session, appSession.profile),
            requiresEmailConfirmation: false,
          },
          appSession.opaqueToken,
          { status: 201 },
        );
      } finally {
        await discardSupabaseSession(data.session);
      }
    }

    const verifier = storage.getCodeVerifier();
    if (!verifier) throw new ApiError("No se pudo preparar la confirmación segura.", 500);
    await storePkceFlow(flow, verifier, "signup");
    return Response.json(
      { data: { session: null, user: null, requiresEmailConfirmation: true } },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
