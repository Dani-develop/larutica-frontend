export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
export function apiErrorResponse(error: unknown): Response {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Error inesperado.";

  if (!(error instanceof ApiError)) {
    console.error("Error interno de API", error);
  }

  return Response.json(
    { error: status === 500 ? "Error interno del servidor." : message },
    {
      status,
      headers: { "cache-control": "no-store" },
    },
  );
}

function requestOrigin(request: Request): string {
  const fallback = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();

  // Render terminates TLS at its proxy, so the runtime URL can be internal
  // while the browser Origin contains the public HTTPS origin.
  if (forwardedHost && (forwardedProto === "http" || forwardedProto === "https")) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return fallback;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin(request)) {
    throw new ApiError("Origen de la solicitud no permitido.", 403);
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
    throw new ApiError("Solicitud entre sitios no permitida.", 403);
  }
}
