import { assertSameOrigin, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { deletePasskey } from "@/lib/supabase/passkeys";
import { requireAppSession } from "@/lib/supabase/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { session } = await requireAppSession(request);
    const { id } = await context.params;
    await deletePasskey(session.userId, id);
    return Response.json({ data: null }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
