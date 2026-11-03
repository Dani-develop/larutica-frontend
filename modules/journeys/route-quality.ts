import type { JourneyGeometry, JourneyPlace } from './types';

const radians = Math.PI / 180;
/** Local distances in metres, adequate for checking access to a Costa Rican road. */
export function pointDistance(a: Pick<JourneyPlace, 'lat' | 'lon'>, b: Pick<JourneyPlace, 'lat' | 'lon'>) {
  const x = (b.lon - a.lon) * radians * Math.cos((a.lat + b.lat) * radians / 2);
  const y = (b.lat - a.lat) * radians;
  return Math.hypot(x, y) * 6371000;
}

/** Do not silently confirm a provider's route snapped far away from the chosen places. */
export function routeGeometryIssue(points: JourneyPlace[], geometry: JourneyGeometry): string | null {
  const lines = geometry.coordinates;
  const first = lines[0][0], last = lines.at(-1)!.at(-1)!;
  const accessLimit = 250;
  const accessIssue = (i: number) => `El trazado no llega cerca de ${i === 0 ? 'la salida' : i === points.length - 1 ? 'la llegada' : `la parada ${i}`}. Selecciona su entrada o mueve el marcador a un acceso cercano; no podemos confirmar este recorrido.`;
  if (pointDistance(points[0], { lon: first[0], lat: first[1] }) > accessLimit) return accessIssue(0);
  if (pointDistance(points.at(-1)!, { lon: last[0], lat: last[1] }) > accessLimit) return accessIssue(points.length - 1);
  // Keep the user's stop order. Never optimize or move their selected places silently.
  const segments = lines.flatMap(line => line.slice(1).map((b, i) => [line[i], b]));
  let progress = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const scaleX = radians * 6371000 * Math.cos(p.lat * radians), scaleY = radians * 6371000;
    let best = Infinity, nextProgress = progress;
    for (let s = Math.floor(progress); s < segments.length; s++) {
      const [a, b] = segments[s];
      const ax = (a[0] - p.lon) * scaleX, ay = (a[1] - p.lat) * scaleY;
      const dx = (b[0] - a[0]) * scaleX, dy = (b[1] - a[1]) * scaleY;
      const minimum = s === Math.floor(progress) ? progress - s : 0;
      const t = Math.max(minimum, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
      const gap = Math.hypot(ax + t * dx, ay + t * dy);
      if (gap < best) { best = gap; nextProgress = s + t; }
    }
    if (best > accessLimit) return accessIssue(i);
    progress = nextProgress;
  }
  return null;
}
