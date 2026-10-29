import { apiErrorResponse, assertSameOrigin, ApiError } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { mapKey } from "@/lib/maps/provider";
import { fetchMapTile } from '@/lib/maps/tile';
export async function GET(request: Request, context: {params:Promise<{z:string;x:string;y:string}>}) {
  try {
    const remote = await proxyRemoteApiRequest(request);
    if (remote) return remote;
    assertSameOrigin(request);
    const {z,x,y} = await context.params;
    if (![z,x,y].every(n=>/^\d{1,8}$/.test(n)) || +z>19 || +x>=2**+z || +y>=2**+z) throw new ApiError("Mapa no disponible.",400);
    const url = new URL(`https://maps.geoapify.com/v1/tile/osm-carto/${z}/${x}/${y}.png`);
    url.searchParams.set("apiKey",mapKey());
    const tile = await fetchMapTile(url);
    return new Response(tile,{headers:{"content-type":"image/png","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}});
  } catch(error) { return apiErrorResponse(error); }
}
