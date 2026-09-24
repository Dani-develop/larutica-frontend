import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { ApiError } from "@/lib/api/errors";
import { clientOrigin } from "@/lib/api/request-origin";
import { getSupabaseAdminClient } from "./admin-client";
import type { ProfileRow } from "./profiles";
import { createOpaqueToken, hashOpaqueToken } from "./session";

const RP_NAME = "LaRutica";
const CHALLENGE_SECONDS = 5 * 60;
const MAX_PASSKEYS_PER_USER = 10;

type FlowKind = "registration" | "authentication";

type PasskeyRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[];
  device_type: "singleDevice" | "multiDevice";
  backed_up: boolean;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

export type PublicPasskey = {
  id: string;
  name: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

function toPublicPasskey(row: PasskeyRow): PublicPasskey {
  return {
    id: row.id,
    name: row.name,
    backedUp: row.backed_up,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

// El RP ID debe coincidir con el dominio que ve el navegador. En desarrollo el
// proxy remoto informa el origen local mediante x-larutica-client-origin.
function relyingParty(request: Request) {
  const origin = clientOrigin(request);
  return { origin, rpID: new URL(origin).hostname };
}

async function storeChallenge(challenge: string, flowKind: FlowKind, userId: string | null) {
  const admin = getSupabaseAdminClient();
  await admin.from("passkey_challenges").delete().lt("expires_at", new Date().toISOString());

  const flowId = createOpaqueToken();
  const { error } = await admin.from("passkey_challenges").insert({
    flow_hash: await hashOpaqueToken(flowId),
    challenge,
    flow_kind: flowKind,
    user_id: userId,
    expires_at: new Date(Date.now() + CHALLENGE_SECONDS * 1000).toISOString(),
  });
  if (error) throw error;
  return flowId;
}

async function consumeChallenge(flowId: unknown, flowKind: FlowKind) {
  if (typeof flowId !== "string" || !flowId) {
    throw new ApiError("La solicitud de passkey no es válida.", 400);
  }
  const { data, error } = await getSupabaseAdminClient()
    .from("passkey_challenges")
    .delete()
    .eq("flow_hash", await hashOpaqueToken(flowId))
    .eq("flow_kind", flowKind)
    .select("challenge,user_id,expires_at")
    .maybeSingle();
  if (error) throw error;
  if (!data || Date.parse(data.expires_at) <= Date.now()) {
    throw new ApiError("La solicitud de passkey expiró. Inténtalo de nuevo.", 400);
  }
  return data as { challenge: string; user_id: string | null; expires_at: string };
}

function parsePasskeyName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return "Passkey";
  if (name.length > 60) throw new ApiError("El nombre debe tener máximo 60 caracteres.", 400);
  return name;
}

export async function listPasskeys(userId: string): Promise<PublicPasskey[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("user_passkeys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as PasskeyRow[]).map(toPublicPasskey);
}

export async function deletePasskey(userId: string, passkeyId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(passkeyId)) throw new ApiError("La passkey no existe.", 404);
  const { data, error } = await getSupabaseAdminClient()
    .from("user_passkeys")
    .delete()
    .eq("id", passkeyId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("La passkey no existe.", 404);
}

export async function createRegistrationOptions(request: Request, profile: ProfileRow) {
  const { data, error } = await getSupabaseAdminClient()
    .from("user_passkeys")
    .select("credential_id,transports")
    .eq("user_id", profile.id);
  if (error) throw error;
  const existing = data as Pick<PasskeyRow, "credential_id" | "transports">[];
  if (existing.length >= MAX_PASSKEYS_PER_USER) {
    throw new ApiError(`Solo puedes registrar ${MAX_PASSKEYS_PER_USER} passkeys.`, 400);
  }

  const { rpID } = relyingParty(request);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: profile.email,
    userDisplayName: profile.full_name || profile.email,
    userID: new TextEncoder().encode(profile.id),
    attestationType: "none",
    excludeCredentials: existing.map((row) => ({
      id: row.credential_id,
      transports: row.transports,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });

  const flowId = await storeChallenge(options.challenge, "registration", profile.id);
  return { flowId, options };
}

export async function verifyRegistration(
  request: Request,
  userId: string,
  body: { flowId?: unknown; response?: unknown; name?: unknown },
): Promise<PublicPasskey> {
  const name = parsePasskeyName(body.name);
  const flow = await consumeChallenge(body.flowId, "registration");
  if (flow.user_id !== userId) throw new ApiError("La solicitud de passkey no es válida.", 400);

  const { origin, rpID } = relyingParty(request);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response as RegistrationResponseJSON,
      expectedChallenge: flow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    throw new ApiError("No se pudo verificar la passkey.", 400);
  }
  if (!verification.verified) throw new ApiError("No se pudo verificar la passkey.", 400);

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const { data, error } = await getSupabaseAdminClient()
    .from("user_passkeys")
    .insert({
      user_id: userId,
      credential_id: credential.id,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      name,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new ApiError("Esta passkey ya está registrada.", 409);
    throw error;
  }
  return toPublicPasskey(data as PasskeyRow);
}

export async function createAuthenticationOptions(request: Request) {
  const { rpID } = relyingParty(request);
  // Sin allowCredentials: el navegador ofrece las passkeys guardadas para este sitio.
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });
  const flowId = await storeChallenge(options.challenge, "authentication", null);
  return { flowId, options };
}

// Devuelve el user_id dueño de la passkey si la firma es válida.
export async function verifyAuthentication(
  request: Request,
  body: { flowId?: unknown; response?: unknown },
): Promise<string> {
  const flow = await consumeChallenge(body.flowId, "authentication");
  const response = body.response as AuthenticationResponseJSON | undefined;
  if (!response || typeof response.id !== "string") {
    throw new ApiError("La solicitud de passkey no es válida.", 400);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_passkeys")
    .select("*")
    .eq("credential_id", response.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("Esta passkey no está registrada en LaRutica.", 401);
  const row = data as PasskeyRow;

  const { origin, rpID } = relyingParty(request);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: flow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: row.credential_id,
        publicKey: isoBase64URL.toBuffer(row.public_key),
        counter: Number(row.counter),
        transports: row.transports,
      },
      requireUserVerification: true,
    });
  } catch {
    throw new ApiError("No se pudo verificar la passkey.", 401);
  }
  if (!verification.verified) throw new ApiError("No se pudo verificar la passkey.", 401);

  const { error: updateError } = await admin
    .from("user_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      backed_up: verification.authenticationInfo.credentialBackedUp,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (updateError) throw updateError;

  return row.user_id;
}
