import { assertSameOrigin, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { verifyRegistration } from "@/lib/supabase/passkeys";
import { requireAppSession } from "@/lib/supabase/session";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { session } = await requireAppSession(request);
    const passkey = await verifyRegistration(request, session.userId, await request.json());
    return Response.json(
      { data: passkey },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
