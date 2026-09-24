import { assertSameOrigin, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { createRegistrationOptions } from "@/lib/supabase/passkeys";
import { requireAppSession } from "@/lib/supabase/session";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { profile } = await requireAppSession(request);
    return Response.json(
      { data: await createRegistrationOptions(request, profile) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
