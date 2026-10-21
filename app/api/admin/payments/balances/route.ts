import { assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { listAgencyBalances } from "@/lib/payments/admin";
import { adminErrorResponse, requireAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin } = await requireAdmin(request);
    return Response.json(
      { data: await listAgencyBalances(admin) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
