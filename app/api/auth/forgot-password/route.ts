import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { requestPasswordReset } from "@/lib/auth/password-reset-store";
import { normalizeResetEmail, RESET_EMAIL_INVALID } from "@/lib/auth/password-reset";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const body = await request.json() as { email?: unknown };
    const email = normalizeResetEmail(body.email);
    if (!email) throw new ApiError(RESET_EMAIL_INVALID, 400);
    const { challengeId } = await requestPasswordReset(email);
    return Response.json({ data: { challengeId } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
