import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { geoapify, requireMapPublisher, signJourney } from "@/lib/maps/provider";
import { placeSchema, journeySchema } from "@/lib/maps/validation";
import { routeInputIssue } from "@/modules/journeys/route-input";
import { z } from "zod";
import { emptyJourney, type JourneyGeometry } from "@/modules/journeys/types";
const schema = z.object({mode:z.enum(["drive","walk","hike"]),points:z.array(placeSchema).min(2).max(12)});
export async function POST(request: Request) {
  try {
    await requireMapPublisher(request);
    const parsed = schema.safeParse(await request.json().catch(()=>null));
    if (!parsed.success) throw new ApiError("Selecciona salida, llegada y paradas válidas.",400);
    const {mode,points} = parsed.data;
    const issue = routeInputIssue(points,mode);
    if (issue) throw new ApiError(issue,422);
    const result = await geoapify("/v1/routing",{waypoints:points.map(p=>`${p.lat},${p.lon}`).join("|"),mode,lang:"es",units:"metric"}) as {
      features?: {geometry:JourneyGeometry;properties:{distance:number;time:number}}[];
    };
    const route = result?.features?.[0];
    if (!route?.geometry || !route.properties || !Number.isFinite(route.properties.distance) || route.properties.distance <= 0 || !Number.isFinite(route.properties.time)) {
      throw new ApiError("No se encontró un trayecto. Si salida y llegada coinciden, añade una parada intermedia.",422);
    }
    const journey = {...emptyJourney(),mode,points,geometry:route.geometry,distance:route.properties.distance,duration:route.properties.time};
    if (!journeySchema.safeParse(journey).success) throw new ApiError("El servicio devolvió un trazado incompleto. Reintenta el cálculo.",502);
    if (JSON.stringify(journey).length > 1_500_000) throw new ApiError("El recorrido tiene demasiados detalles para guardarlo. Reduce las paradas o divide el trayecto.",422);
    journey.integrity = await signJourney(journey);
    return Response.json({data:journey},{headers:{"cache-control":"no-store"}});
  } catch(error) { return apiErrorResponse(error); }
}
