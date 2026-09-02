import { apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { requireAppSession, sessionPayload } from "@/lib/supabase/session";

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    const appSession = await requireAppSession(request);
    return Response.json(
      { data: sessionPayload(appSession.session, appSession.profile) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
