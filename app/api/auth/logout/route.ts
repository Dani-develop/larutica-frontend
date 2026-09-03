import { NextResponse } from "next/server";
import { assertSameOrigin, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { clearSessionCookies, revokeAppSession } from "@/lib/supabase/session";

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    await revokeAppSession(request);
    return clearSessionCookies(NextResponse.json(
      { data: null },
      { headers: { "cache-control": "no-store" } },
    ));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
