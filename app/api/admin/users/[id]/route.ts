import {
  AdminApiError,
  adminErrorResponse,
  parseAdminUserPayload,
  requireAdmin,
} from "@/lib/supabase/admin";
import { assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin } = await requireAdmin(request);
    const { id } = await context.params;
    const payload = parseAdminUserPayload(await request.json());

    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email: payload.email,
      user_metadata: {
        full_name: payload.name,
        role: payload.role,
        phone: payload.phone,
        business_name: payload.businessName,
      },
    });
    if (authError) throw new AdminApiError(authError.message, 400);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: payload.name,
        email: payload.email,
        role: payload.role,
        phone: payload.phone || null,
        business_name: payload.businessName || null,
        status: payload.status,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (profileError) throw profileError;
    return Response.json({ data: profile });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin, caller } = await requireAdmin(request);
    const { id } = await context.params;
    if (id === caller.id) {
      throw new AdminApiError("No puedes eliminar tu propia cuenta administrativa.", 400);
    }
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new AdminApiError(error.message, 400);
    return Response.json({ data: null });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
