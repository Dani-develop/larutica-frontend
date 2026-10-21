import { apiErrorResponse, assertSameOrigin, ApiError } from "@/lib/api/errors";
import { mapKey } from "@/lib/maps/provider";
export async function GET(request: Request, context: {params:Promise<{z:string;x:string;y:string}>}) {
  try {
    assertSameOrigin(request);
    const {z,x,y} = await context.params;
    if (![z,x,y].every(n=>/^\d{1,8}$/.test(n)) || +z>19 || +x>=2**+z || +y>=2**+z) throw new ApiError("Mapa no disponible.",400);
    const url = new URL(`https://maps.geoapify.com/v1/tile/osm-carto/${z}/${x}/${y}.png`);
    url.searchParams.set("apiKey",mapKey());
    let response:Response;
    try { response = await fetch(url,{signal:AbortSignal.timeout(15000)}); }
    catch { throw new ApiError("No se pudo cargar el mapa.",502); }
    if (!response.ok) throw new ApiError("El mapa no está disponible temporalmente.",502);
    return new Response(response.body,{headers:{"content-type":"image/png","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}});
  } catch(error) { return apiErrorResponse(error); }
}
