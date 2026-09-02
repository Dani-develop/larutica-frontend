import { createClient, type Session, type SupportedStorage } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { getSupabaseAdminClient } from "./admin-client";

const PKCE_STORAGE_KEY = "larutica-pkce";
const PKCE_VERIFIER_KEY = `${PKCE_STORAGE_KEY}-code-verifier`;

class MemoryStorage implements SupportedStorage {
  private readonly values = new Map<string, string>();

  constructor(codeVerifier?: string) {
    if (codeVerifier) this.values.set(PKCE_VERIFIER_KEY, codeVerifier);
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  getCodeVerifier() {
    return this.values.get(PKCE_VERIFIER_KEY) ?? null;
  }
}

function publicConfiguration() {
  const url = process.env.SUPABASE_URL
    ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new ApiError("Falta configurar Supabase en el servidor.", 500);
  }
  return { url, publishableKey };
}

export function createPasswordAuthClient() {
  const { url, publishableKey } = publicConfiguration();
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) return "El correo o la contraseña no son correctos.";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo antes de iniciar sesión.";
  if (/user already registered/i.test(message)) return "Ya existe una cuenta con ese correo.";
  if (/password should be/i.test(message)) return "La contraseña no cumple los requisitos de seguridad.";
  if (/email rate limit exceeded|over_email_send_rate_limit/i.test(message)) {
    return "Se alcanzó temporalmente el límite de correos de Supabase.";
  }
  return message;
}

export function createPkceAuthClient(codeVerifier?: string) {
  const { url, publishableKey } = publicConfiguration();
  const storage = new MemoryStorage(codeVerifier);
  const client = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      flowType: "pkce",
      storageKey: PKCE_STORAGE_KEY,
      storage,
    },
  });
  return { client, storage };
}

export async function discardSupabaseSession(session: Session | null) {
  if (!session?.access_token) return;
  try {
    await getSupabaseAdminClient().auth.admin.signOut(session.access_token, "local");
  } catch {
    // La sesión propia de LaRutica ya es suficiente; esta revocación es defensa adicional.
  }
}
