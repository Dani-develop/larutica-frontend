import { NextResponse } from "next/server";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { clientUrl } from "@/lib/api/request-origin";
import { createPkceAuthClient, discardSupabaseSession } from "@/lib/supabase/server-auth";
import {
  consumePkceFlow,
  createAppSession,
  setSessionCookie,
} from "@/lib/supabase/session";

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const opaqueFlow = url.searchParams.get("flow");
  if (!code || !opaqueFlow) {
    return NextResponse.redirect(clientUrl("/login?reason=invalid-link", request));
  }

  try {
    const flow = await consumePkceFlow(opaqueFlow);
    const { client } = createPkceAuthClient(flow.code_verifier);
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session || !data.user) throw error ?? new Error("Intercambio PKCE inválido.");

    try {
      const appSession = await createAppSession(data.user.id);
      const destination = flow.flow_kind === "recovery" ? "/update-password" : "/dashboard";
      return setSessionCookie(
        NextResponse.redirect(clientUrl(destination, request)),
        appSession.opaqueToken,
      );
    } finally {
      await discardSupabaseSession(data.session);
    }
  } catch {
    return NextResponse.redirect(clientUrl("/login?reason=expired-link", request));
  }
}
