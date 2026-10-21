import { ApiError, assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { assertUuid, createSettlement, listSettlements, parseSettlementBody } from "@/lib/payments/admin";
import { adminErrorResponse, requireAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin } = await requireAdmin(request);
    const agencyId = new URL(request.url).searchParams.get("agencyId");
    return Response.json(
      { data: await listSettlements(admin, agencyId ? assertUuid(agencyId, "La agencia") : undefined) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin, caller } = await requireAdmin(request);
    const body = await request.json().catch(() => {
      throw new ApiError("No pudimos leer la solicitud. Revisa los datos e intenta de nuevo.", 400);
    });
    const settlement = await createSettlement(admin, caller.id, parseSettlementBody(body));
    return Response.json({ data: settlement }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
