import { assertSameOrigin, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { createAuthenticationOptions } from "@/lib/supabase/passkeys";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    return Response.json(
      { data: await createAuthenticationOptions(request) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
