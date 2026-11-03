import { ApiError } from '../api/errors';
import { mapProviderFailure } from './provider-errors';

// Official equivalent endpoints. Never send the server key to an arbitrary host.
const origins = ['https://api-eu.geoapify.com', 'https://api.geoapify.com'];
let preferred = 0;
let preferredUntil = 0;

export async function requestGeoapify(endpoint: string, params: Record<string, string>, key: string, fetcher: typeof fetch = fetch) {
  const first = preferredUntil > Date.now() ? preferred : 0;
  let timedOut = false;
  for (const index of [first, 1 - first]) {
    const url = new URL(endpoint, origins[index]);
    Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
    url.searchParams.set('apiKey', key);
    const started = Date.now();
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(3500) });
      if (!response.ok) {
        if ([500, 502, 503, 504].includes(response.status)) {
          await response.body?.cancel();
          console.warn('map_provider_retry', { host: url.hostname, status: response.status, ms: Date.now() - started });
          continue;
        }
        const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
        const failure = mapProviderFailure(response.status, body?.message ?? body?.error ?? '', endpoint === '/v1/routing', params.mode);
        // Invalid places, credentials and exhausted quota cannot be fixed by retrying.
        throw new ApiError(failure.message, failure.status);
      }
      const data: unknown = await response.json();
      preferred = index;
      preferredUntil = Date.now() + 300_000;
      if (index !== first) console.info('map_provider_recovered', { host: url.hostname, ms: Date.now() - started });
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      timedOut ||= error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
      // Deliberately omit request URLs, keys, selected places and raw exception text.
      const code = (error as { cause?: { code?: unknown } })?.cause?.code;
      console.warn('map_provider_retry', { host: url.hostname, ms: Date.now() - started,
        kind: timedOut ? 'timeout' : 'connection_or_body', ...(typeof code === 'string' && /^[A-Z_]+$/.test(code) ? { code } : {}) });
    }
  }
  throw new ApiError(timedOut
    ? 'El servicio de mapas tardó demasiado. Conservamos tus ubicaciones; intenta nuevamente.'
    : 'No se pudo contactar el servicio de mapas. Intenta nuevamente.', timedOut ? 504 : 502);
}
