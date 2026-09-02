import {
  AdminApiError,
  adminErrorResponse,
  parseAdminUserPayload,
  requireAdmin,
} from "@/lib/supabase/admin";
import { assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    const { admin } = await requireAdmin(request);
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ data }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin } = await requireAdmin(request);
    const payload = parseAdminUserPayload(await request.json(), true);
    const { data, error } = await admin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.name,
        role: payload.role,
        phone: payload.phone,
        business_name: payload.businessName,
      },
    });
    if (error || !data.user) {
      throw new AdminApiError(error?.message ?? "No se pudo crear el usuario.", 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({ role: payload.role, status: payload.status })
      .eq("id", data.user.id)
      .select("*")
      .single();
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }

    return Response.json({ data: profile }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
