import { apiFetch } from "@/lib/api/browser-fetch";
import type { SystemUser, SystemUserInput } from "../models/User";
import { profileRowToSystemUser, type ProfileRow } from "@/lib/supabase/profiles";

export async function listProfiles(): Promise<SystemUser[]> {
  const rows = await adminRequest<ProfileRow[]>("/api/admin/users", { method: "GET" });
  return rows.map(profileRowToSystemUser);
}

export async function updateOwnProfile(
  input: Pick<SystemUserInput, "name" | "phone" | "businessName">,
): Promise<SystemUser> {
  return appRequest<SystemUser>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

async function appRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json() as { data?: T; error?: string };
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("larutica-auth-expired"));
    }
    throw new Error(payload.error ?? "No se pudo completar la operación.");
  }
  return payload.data as T;
}

const adminRequest = appRequest;

export async function adminCreateUser(input: SystemUserInput & { password: string }) {
  const row = await adminRequest<ProfileRow>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return profileRowToSystemUser(row);
}

export async function adminUpdateUser(id: string, input: SystemUserInput) {
  const row = await adminRequest<ProfileRow>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return profileRowToSystemUser(row);
}

export async function adminDeleteUser(id: string) {
  await adminRequest<null>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
