import { ApiError } from '../api/errors';

export async function fetchMapTile(url: URL, fetcher: typeof fetch = fetch): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        await response.body?.cancel();
        if (attempt === 0 && [502, 503, 504].includes(response.status)) continue;
        throw new ApiError('El mapa no está disponible temporalmente.', 502);
      }
      // Consume inside the timeout/error boundary: don't send a broken 200 stream.
      return await response.arrayBuffer();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt === 1) throw new ApiError('No se pudo cargar el mapa.', 502);
    }
  }
  throw new ApiError('No se pudo cargar el mapa.', 502);
}
