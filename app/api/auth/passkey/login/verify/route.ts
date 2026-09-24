import { assertSameOrigin, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { verifyAuthentication } from "@/lib/supabase/passkeys";
import { createAppSession, jsonWithSession, sessionPayload } from "@/lib/supabase/session";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const userId = await verifyAuthentication(request, await request.json());
    const appSession = await createAppSession(userId);
    return jsonWithSession(
      sessionPayload(appSession.session, appSession.profile),
      appSession.opaqueToken,
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
