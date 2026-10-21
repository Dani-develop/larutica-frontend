import { ApiError, assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { assertUuid, parseCommissionBody, setAgencyCommission } from "@/lib/payments/admin";
import { adminErrorResponse, requireAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin } = await requireAdmin(request);
    const agencyId = assertUuid((await context.params).id, "La agencia");
    const body = await request.json().catch(() => {
      throw new ApiError("No pudimos leer la solicitud. Revisa los datos e intenta de nuevo.", 400);
    });
    const commissionRate = parseCommissionBody(body);
    await setAgencyCommission(admin, agencyId, commissionRate);
    return Response.json({ data: { agencyId, commissionRate } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
