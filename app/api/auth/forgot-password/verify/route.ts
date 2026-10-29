import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { RESET_CODE_EXHAUSTED, RESET_CODE_INVALID } from "@/lib/auth/password-reset";
import { verifyResetCode } from "@/lib/auth/password-reset-store";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const body = await request.json() as { challengeId?: unknown; code?: unknown };
    const challengeId = String(body.challengeId ?? "");
    const code = String(body.code ?? "").trim();
    const result = await verifyResetCode(challengeId, code);
    if (result.outcome === "grant") {
      return Response.json(
        { data: { resetGrant: result.resetGrant } },
        { headers: { "cache-control": "no-store" } },
      );
    }
    throw new ApiError(result.outcome === "exhausted" ? RESET_CODE_EXHAUSTED : RESET_CODE_INVALID, 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
