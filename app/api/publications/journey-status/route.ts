import { apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { requireAppSession } from "@/lib/supabase/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;
  try {
    await requireAppSession(request);
    const { error } = await getSupabaseAdminClient().from("publications").select("journey,journey_required").limit(0);
    if (error) return Response.json({error:"El servicio de trayectos necesita una actualización."},{status:503});
    return Response.json({data:{journeys:1}},{headers:{"cache-control":"no-store"}});
  } catch(error) { return apiErrorResponse(error); }
}
