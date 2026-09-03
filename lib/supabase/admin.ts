import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { getSupabaseAdminClient } from "./admin-client";
import { requireAppSession } from "./session";

export async function requireAdmin(request: Request): Promise<{
  admin: SupabaseClient;
  caller: { id: string };
}> {
  const appSession = await requireAppSession(request);
  if (appSession.profile.role !== "Admin") {
    throw new AdminApiError("Se requiere el rol Admin.", 403);
  }
  return { admin: getSupabaseAdminClient(), caller: { id: appSession.session.userId } };
}

export class AdminApiError extends ApiError {}

export function adminErrorResponse(error: unknown) {
  return apiErrorResponse(error);
}

export type AdminUserPayload = {
  name: string;
  email: string;
  role: "Viajero" | "Agencia" | "Transporte" | "Admin";
  phone: string;
  businessName: string;
  status: "Activo" | "Inactivo";
  password?: string;
};

export function parseAdminUserPayload(value: unknown, requirePassword = false): AdminUserPayload {
  if (!value || typeof value !== "object") {
    throw new AdminApiError("Los datos del usuario no son válidos.", 400);
  }
  const body = value as Record<string, unknown>;
  const payload: AdminUserPayload = {
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim().toLowerCase(),
    role: String(body.role ?? "") as AdminUserPayload["role"],
    phone: String(body.phone ?? "").trim(),
    businessName: String(body.businessName ?? "").trim(),
    status: String(body.status ?? "") as AdminUserPayload["status"],
    password: typeof body.password === "string" ? body.password : undefined,
  };

  if (payload.name.length < 2 || !/^\S+@\S+\.\S+$/.test(payload.email)) {
    throw new AdminApiError("Nombre y correo válidos son obligatorios.", 400);
  }
  if (!["Viajero", "Agencia", "Transporte", "Admin"].includes(payload.role)) {
    throw new AdminApiError("El rol no es válido.", 400);
  }
  if (!["Activo", "Inactivo"].includes(payload.status)) {
    throw new AdminApiError("El estado no es válido.", 400);
  }
  if (requirePassword && (!payload.password || payload.password.length < 8)) {
    throw new AdminApiError("La contraseña temporal debe tener al menos 8 caracteres.", 400);
  }
  return payload;
}
