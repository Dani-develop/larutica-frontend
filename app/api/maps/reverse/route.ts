import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { geoapify, normalizePlace, requireMapPublisher } from "@/lib/maps/provider";
import { placeSchema } from "@/lib/maps/validation";
export async function GET(request: Request) {
  try {
    await requireMapPublisher(request);
    const params = new URL(request.url).searchParams;
    const lat = Number(params.get("lat")), lon = Number(params.get("lon"));
    if (!params.has("lat") || !params.has("lon") || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < 5 || lat > 11.5 || lon < -88 || lon > -82.4) {
      throw new ApiError("El punto seleccionado no está dentro del área de Costa Rica.",400);
    }
    const result = await geoapify("/v1/geocode/reverse",{lat:String(lat),lon:String(lon),lang:"es",limit:"1",format:"json"}) as {results?:Record<string,unknown>[]};
    if(!Array.isArray(result?.results))throw new ApiError("El servicio devolvió una dirección incompleta.",502);
    const place = result.results.find(p=>p.country_code === "cr");
    if (!place) return Response.json({data:null},{headers:{"cache-control":"private, max-age=60"}});
    const normalized={...normalizePlace(place),lat,lon,type:"map_point",adjusted:true};
    if(!placeSchema.safeParse(normalized).success)throw new ApiError("No se obtuvo una dirección completa para este punto.",502);
    return Response.json({data:normalized},
      {headers:{"cache-control":"private, max-age=60"}});
  } catch(error) { return apiErrorResponse(error); }
}
