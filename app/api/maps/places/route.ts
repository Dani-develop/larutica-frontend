import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { geoapify, normalizePlace, requireMapPublisher } from "@/lib/maps/provider";
import { isSpecificPlace } from "@/modules/journeys/route-input";
import { placeSchema } from "@/lib/maps/validation";
export async function GET(request: Request) {
  try {
    const remote = await proxyRemoteApiRequest(request);
    if (remote) return remote;
    await requireMapPublisher(request);
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 3 || q.length > 180) throw new ApiError("Escribe entre 3 y 180 caracteres para buscar.",400);
    const result = await geoapify("/v1/geocode/autocomplete",{text:q,filter:"countrycode:cr",lang:"es",limit:"10",format:"json"}) as {results: Record<string,unknown>[]};
    if(!Array.isArray(result?.results))throw new ApiError("El servicio devolvió una búsqueda incompleta. Intenta nuevamente.",502);
    return Response.json({data:result.results.filter(p=>p.country_code === "cr" && p.place_id && isSpecificPlace(typeof p.result_type === "string" ? p.result_type : undefined)).map(normalizePlace).filter(p=>placeSchema.safeParse(p).success)},
      {headers:{"cache-control":"private, max-age=60"}});
  } catch(error) { return apiErrorResponse(error); }
}
