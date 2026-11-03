import type { JourneyPlace, JourneyMode } from "./types";
import { pointDistance } from './route-quality';

const areas = new Set(["country", "state", "county", "postcode"]);
export function isSpecificPlace(type?: string): boolean {
  return !type || !areas.has(type);
}
export function routeInputIssue(points: (JourneyPlace|null)[], mode: JourneyMode): string|null {
  if (points.length < 2 || points.length > 12) return "Define salida, llegada y hasta diez paradas intermedias.";
  if (points.some(p => !p)) return "Selecciona una sugerencia para cada punto del recorrido.";
  for (const point of points as JourneyPlace[]) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || point.lat < 5 || point.lat > 11.5 || point.lon < -88 || point.lon > -82.4) {
      return "Una ubicación tiene coordenadas inválidas. Selecciónala nuevamente.";
    }
    if (!point.adjusted && !isSpecificPlace(point.type)) {
      return "Selecciona una ciudad, dirección o acceso concreto. Una provincia o zona postal no define el punto del recorrido.";
    }
  }
  if (mode !== "locations") {
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1]!, b = points[i]!;
      if (pointDistance(a,b) < 10) {
        return points.length === 2
          ? "Salida y llegada coinciden o están a menos de 10 metros. Añade una parada para definir un recorrido circular."
          : "Hay dos puntos consecutivos a menos de 10 metros. Cambia o elimina la parada repetida.";
      }
    }
  }
  return null;
}
