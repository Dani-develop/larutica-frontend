import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { requireAppSession } from "@/lib/supabase/session";
import type { Journey, JourneyPlace } from "@/modules/journeys/types";
import { mapProviderFailure } from "./provider-errors";

export function mapKey(): string {
  const key = (process.env.GEOAPIFY_API_KEY ?? process.env.GEOAPIFY)?.trim();
  if (!key) throw new ApiError("El servicio de mapas todavía no está configurado.", 503);
  return key;
}
export async function requireMapPublisher(request: Request) {
  assertSameOrigin(request);
  const sessionRequest = new Request(new URL("/api/auth/session", request.url), { headers: request.headers });
  const remote = await proxyRemoteApiRequest(sessionRequest);
  let role: string | undefined;
  if (remote) {
    if (!remote.ok) throw new ApiError("Inicia sesión para definir el trayecto.", 401);
    const body = await remote.json() as { data?: { role?: string; user?: {role?:string} } };
    role = body.data?.role ?? body.data?.user?.role;
  } else {
    role = (await requireAppSession(request)).profile.role;
  }
  if (role !== "Agencia" && role !== "Transporte") throw new ApiError("No tienes permisos para definir trayectos.", 403);
}
const cache = new Map<string, { until: number; value: unknown }>();
export async function geoapify(endpoint: string, params: Record<string,string>) {
  const cacheKey = endpoint + JSON.stringify(params);
  const hit = cache.get(cacheKey);
  if (hit && hit.until > Date.now()) return hit.value;
  const url = new URL(endpoint, "https://api.geoapify.com");
  Object.entries(params).forEach(([name,value]) => url.searchParams.set(name,value));
  url.searchParams.set("apiKey", mapKey());
  let response: Response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(20000) }); }
  catch { throw new ApiError("No se pudo contactar el servicio de mapas. Intenta nuevamente.", 502); }
  if (!response.ok) {
    const body = await response.json().catch(()=>null) as {message?:string;error?:string}|null;
    const failure = mapProviderFailure(response.status,body?.message ?? body?.error ?? "",endpoint === "/v1/routing",params.mode);
    throw new ApiError(failure.message,failure.status);
  }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new ApiError("El servicio de mapas devolvió una respuesta incompleta. Intenta nuevamente.",502); }
  if (cache.size >= 150) cache.delete(cache.keys().next().value!);
  cache.set(cacheKey,{ until: Date.now()+300_000, value:data });
  return data;
}
type GeoPlace = Record<string, unknown>;
function text(value: unknown): string | undefined { return typeof value === "string" && value ? value : undefined; }
export function normalizePlace(p: GeoPlace): JourneyPlace {
  return {
    id: String(p.place_id), name: String(p.name || p.address_line1 || p.city || p.formatted),
    label: String(p.formatted), lat: Number(p.lat), lon: Number(p.lon),
    country: text(p.country), province: text(p.state),
    canton: text(p.county), district: text(p.district),
    type: text(p.result_type), locality: text(p.city),
    address: [text(p.street), text(p.housenumber)].filter(Boolean).join(" ") || undefined,
  };
}
function signedData(journey: Journey) {
  // Fixed ordering survives JSONB normalization. Meeting instructions do not change a road route.
  return JSON.stringify({mode:journey.mode,points:journey.points.map(p=>p ? [p.lat,p.lon] : null),
    geometry:journey.geometry ? {type:journey.geometry.type,coordinates:journey.geometry.coordinates} : null,
    distance:journey.distance,duration:journey.duration});
}
async function signingKey() {
  return crypto.subtle.importKey("raw",new TextEncoder().encode(mapKey()),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
export async function signJourney(journey: Journey): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC",await signingKey(),new TextEncoder().encode(signedData(journey)));
  return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function verifyJourney(journey: Journey | null, existing?: Journey | null) {
  if (!journey?.geometry) return;
  // Stored routes remain editable after a provider key rotation.
  if (existing && signedData(journey) === signedData(existing) && journey.integrity === existing.integrity) return;
  if (!journey.integrity || !/^[a-f0-9]{64}$/.test(journey.integrity)) throw new ApiError("Vuelve a calcular el trayecto antes de guardarlo.",400);
  const bytes = Uint8Array.from(journey.integrity.match(/../g)!,b=>parseInt(b,16));
  if (!await crypto.subtle.verify("HMAC",await signingKey(),bytes,new TextEncoder().encode(signedData(journey)))) {
    throw new ApiError("El trayecto cambió. Vuelve a calcularlo y confirmarlo.",400);
  }
}
