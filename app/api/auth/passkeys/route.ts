import { apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { listPasskeys } from "@/lib/supabase/passkeys";
import { requireAppSession } from "@/lib/supabase/session";

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    const { session } = await requireAppSession(request);
    return Response.json(
      { data: await listPasskeys(session.userId) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
