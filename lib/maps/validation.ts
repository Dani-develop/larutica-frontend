import { z } from "zod";
import type { Journey } from "@/modules/journeys/types";
import { journeyReady } from "@/modules/journeys/types";
import { ApiError } from "@/lib/api/errors";

// Costa Rica and its immediate border area; no arbitrary worldwide routing requests.
export const placeSchema = z.object({
  id: z.string().min(1).max(1000), name: z.string().min(1).max(300),
  label: z.string().min(1).max(1000),
  lat: z.number().min(5).max(11.5), lon: z.number().min(-88).max(-82.4),
  country: z.string().max(100).optional(), province: z.string().max(100).optional(),
  canton: z.string().max(100).optional(), district: z.string().max(150).optional(),
  address: z.string().max(500).optional(), adjusted: z.boolean().optional(),
  type: z.string().max(40).optional(), locality: z.string().max(150).optional(),
});
export const journeySchema = z.object({
  version: z.literal(1), mode: z.enum(["drive", "walk", "hike", "locations"]),
  points: z.array(placeSchema.nullable()).min(2).max(12),
  meetingLocation: placeSchema.nullable(),
  geometry: z.object({ type: z.literal("MultiLineString"),
    coordinates: z.array(z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(2)).min(1),
  }).nullable(),
  distance: z.number().finite().nonnegative().nullable(),
  duration: z.number().finite().nonnegative().nullable(),
  integrity: z.string().max(128).nullable(),
  confirmedAt: z.iso.datetime().nullable(),
  meetingAtOrigin: z.boolean().optional(),
  meetingDirectionsAuto: z.boolean().optional(),
});
export function parseJourney(input: unknown, required = false): Journey | null {
  if (input == null) {
    if (required) throw new ApiError("Define y confirma el trayecto antes de enviar la publicación.", 400);
    return null;
  }
  if (JSON.stringify(input).length > 1_500_000) throw new ApiError("El trayecto supera el tamaño permitido.", 400);
  const parsed = journeySchema.safeParse(input);
  if (!parsed.success) throw new ApiError("Los datos del trayecto no son válidos. Revisa las ubicaciones.", 400);
  const journey = parsed.data as Journey;
  if (required && !journeyReady(journey)) throw new ApiError("Revisa y confirma el trayecto antes de continuar.", 400);
  if (journey.mode === "locations" && (journey.geometry || journey.distance !== null || journey.duration !== null)) {
    throw new ApiError("Un recorrido sin trazado automático solo puede contener ubicaciones.", 400);
  }
  return journey;
}
