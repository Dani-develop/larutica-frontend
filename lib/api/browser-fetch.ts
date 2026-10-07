// Short-lived, per-tab cache. HTTP responses remain private/no-store.
const cached = new Map<string, { response: Response; expires: number }>();
const pending = new Map<string, Promise<Response>>();
let generation = 0;
let publicGeneration = 0;
const publicCatalogKey = (key: string) => key.startsWith("/api/catalog:") || key.startsWith("/api/catalog?");
export function clearApiCache(preservePublicCatalog = false) {
  generation++;
  if (!preservePublicCatalog) { publicGeneration++; cached.clear(); pending.clear(); return; }
  // A session change never changes the public catalog, but must discard personal data.
  for (const key of cached.keys()) if (!publicCatalogKey(key)) cached.delete(key);
  for (const key of pending.keys()) if (!publicCatalogKey(key)) pending.delete(key);
}
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    clearApiCache();
    try { return await fetch(input, init); } finally { clearApiCache(); }
  }
  // Abort signals belong to a single consumer, never a shared request.
  if (typeof window === 'undefined' || init.signal || !input.startsWith('/api/')) return fetch(input, init);
  const key = input + ':' + JSON.stringify([...new Headers(init.headers)]);
  const auth = input.startsWith('/api/auth/');
  const hit = cached.get(key);
  if (!auth && hit && hit.expires > Date.now()) return hit.response.clone();
  const shared = pending.get(key);
  if (shared) return (await shared).clone();
  const isPublicCatalog = publicCatalogKey(key);
  const current = isPublicCatalog ? publicGeneration : generation;
  const request = fetch(input, init).then(response => {
    if (response.ok && !auth && current === (isPublicCatalog ? publicGeneration : generation)) {
      if (cached.size >= 100) cached.delete(cached.keys().next().value!);
      cached.set(key, { response: response.clone(), expires: Date.now() + 10_000 });
    }
    return response;
  });
  pending.set(key, request);
  try { return (await request).clone(); }
  finally { if (pending.get(key) === request) pending.delete(key); }
}
