import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { getSupabaseAdminClient } from "./admin-client";
import { profileRowToSystemUser, type ProfileRow } from "./profiles";

const SESSION_BYTES = 32;
const ABSOLUTE_SESSION_SECONDS = 8 * 60 * 60;
const IDLE_SESSION_SECONDS = 30 * 60;

type SessionRow = {
  session_hash: string;
  user_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  idle_expires_at: string;
};

export type PublicSession = {
  userId: string;
  expiresAt: string;
  idleExpiresAt: string;
};

export type AppSession = {
  sessionHash: string;
  session: PublicSession;
  profile: ProfileRow;
};

function sessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-larutica_session"
    : "larutica_session";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createOpaqueToken() {
  const bytes = new Uint8Array(SESSION_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashOpaqueToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

function readSessionCookie(request: Request) {
  return readCookie(request, sessionCookieName())
    ?? readCookie(request, "larutica_session")
    ?? readCookie(request, "__Host-larutica_session");
}

export async function createAppSession(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    throw new ApiError("No existe un perfil asociado a la cuenta.", 403);
  }
  if ((profile as ProfileRow).status !== "Activo") {
    throw new ApiError("La cuenta está inactiva.", 403);
  }

  const opaqueToken = createOpaqueToken();
  const sessionHash = await hashOpaqueToken(opaqueToken);
  const now = Date.now();
  const expiresAt = new Date(now + ABSOLUTE_SESSION_SECONDS * 1000).toISOString();
  const idleExpiresAt = new Date(now + IDLE_SESSION_SECONDS * 1000).toISOString();

  // Una nueva autenticación invalida las sesiones anteriores de esa cuenta.
  const { error: deleteError } = await admin.from("app_sessions").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await admin.from("app_sessions").insert({
    session_hash: sessionHash,
    user_id: userId,
    expires_at: expiresAt,
    idle_expires_at: idleExpiresAt,
  });
  if (insertError) throw insertError;

  return {
    opaqueToken,
    session: { userId, expiresAt, idleExpiresAt } satisfies PublicSession,
    profile: profile as ProfileRow,
  };
}

async function removeSession(sessionHash: string) {
  await getSupabaseAdminClient().from("app_sessions").delete().eq("session_hash", sessionHash);
}

export async function requireAppSession(request: Request): Promise<AppSession> {
  const opaqueToken = readSessionCookie(request);
  if (!opaqueToken) throw new ApiError("No hay una sesión activa.", 401);

  const sessionHash = await hashOpaqueToken(opaqueToken);
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("app_sessions")
    .select("*")
    .eq("session_hash", sessionHash)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("La sesión no es válida.", 401);

  const row = data as SessionRow;
  const now = Date.now();
  if (Date.parse(row.expires_at) <= now || Date.parse(row.idle_expires_at) <= now) {
    await removeSession(sessionHash);
    throw new ApiError("La sesión expiró. Inicia sesión de nuevo.", 401);
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", row.user_id)
    .single();
  if (profileError || !profile) {
    await removeSession(sessionHash);
    throw new ApiError("La cuenta ya no existe.", 401);
  }
  if ((profile as ProfileRow).status !== "Activo") {
    await removeSession(sessionHash);
    throw new ApiError("La cuenta está inactiva.", 403);
  }

  const idleExpiresAt = new Date(now + IDLE_SESSION_SECONDS * 1000).toISOString();
  const { error: touchError } = await admin
    .from("app_sessions")
    .update({ last_seen_at: new Date(now).toISOString(), idle_expires_at: idleExpiresAt })
    .eq("session_hash", sessionHash);
  if (touchError) throw touchError;

  return {
    sessionHash,
    session: { userId: row.user_id, expiresAt: row.expires_at, idleExpiresAt },
    profile: profile as ProfileRow,
  };
}

export async function revokeAppSession(request: Request) {
  const opaqueToken = readSessionCookie(request);
  if (!opaqueToken) return;
  await removeSession(await hashOpaqueToken(opaqueToken));
}

export function sessionPayload(session: PublicSession, profile: ProfileRow) {
  return { session, user: profileRowToSystemUser(profile) };
}

export function jsonWithSession(
  data: unknown,
  opaqueToken: string,
  init?: { status?: number },
) {
  const response = NextResponse.json(
    { data },
    { status: init?.status ?? 200, headers: { "cache-control": "no-store" } },
  );
  return setSessionCookie(response, opaqueToken);
}

export function setSessionCookie<T extends NextResponse>(response: T, opaqueToken: string): T {
  response.cookies.set(sessionCookieName(), opaqueToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ABSOLUTE_SESSION_SECONDS,
    priority: "high",
  });
  return response;
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of new Set([sessionCookieName(), "larutica_session", "__Host-larutica_session"])) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: name.startsWith("__Host-") || process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

export async function storePkceFlow(
  opaqueFlow: string,
  codeVerifier: string,
  flowKind: "signup" | "recovery",
) {
  const admin = getSupabaseAdminClient();
  await admin.from("auth_pkce_flows").delete().lt("expires_at", new Date().toISOString());
  const { error } = await admin.from("auth_pkce_flows").insert({
    flow_hash: await hashOpaqueToken(opaqueFlow),
    code_verifier: codeVerifier,
    flow_kind: flowKind,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
}

export async function consumePkceFlow(opaqueFlow: string) {
  const flowHash = await hashOpaqueToken(opaqueFlow);
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("auth_pkce_flows")
    .delete()
    .eq("flow_hash", flowHash)
    .select("code_verifier,flow_kind,expires_at")
    .maybeSingle();
  if (error) throw error;
  if (!data || Date.parse(data.expires_at) <= Date.now()) {
    throw new ApiError("El enlace expiró o ya fue utilizado.", 400);
  }
  return data as {
    code_verifier: string;
    flow_kind: "signup" | "recovery";
    expires_at: string;
  };
}
