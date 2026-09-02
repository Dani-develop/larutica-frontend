const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function clientOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const forwardedOrigin = request.headers.get("x-larutica-client-origin");
  if (!forwardedOrigin) return requestOrigin;

  try {
    const candidate = new URL(forwardedOrigin);
    const isLocalDevelopment = candidate.protocol === "http:"
      && LOCAL_HOSTS.has(candidate.hostname);
    if (isLocalDevelopment) return candidate.origin;
  } catch {
    // Ignora encabezados inválidos o no autorizados.
  }
  return requestOrigin;
}

export function clientUrl(path: string, request: Request): URL {
  return new URL(path, clientOrigin(request));
}
