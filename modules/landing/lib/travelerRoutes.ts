export const TRIP_QUERIES = [
  "explorar",
  "guardados",
  "reservas",
  "perfil",
  "detalle",
  "compra",
] as const;

export type TripQuery = (typeof TRIP_QUERIES)[number];

export const TRIP_MENU = [
  { id: "guardados", label: "Guardados" },
  { id: "reservas", label: "Mis reservas" },
  { id: "perfil", label: "Mi perfil" },
] as const;

export type TripMenuId = (typeof TRIP_MENU)[number]["id"];

export function parseTrip(value: string | null): TripQuery | null {
  if (value && (TRIP_QUERIES as readonly string[]).includes(value)) {
    return value as TripQuery;
  }
  return null;
}

export function tripPath(
  viaje: TripQuery,
  extra?: { publicacion?: string; provider?: string },
) {
  const params = new URLSearchParams();
  params.set("viaje", viaje);
  if (extra?.publicacion) params.set("publicacion", extra.publicacion);
  if (extra?.provider) params.set("provider", extra.provider);
  return `/?${params.toString()}`;
}

export function travelerDashboardTarget(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const normalized = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

  if (normalized === "/dashboard/publications") {
    const provider = params.get("provider");
    return provider ? tripPath("explorar", { provider }) : tripPath("explorar");
  }
  if (normalized === "/dashboard/promotions") return tripPath("guardados");
  if (normalized === "/dashboard/reviews") return tripPath("reservas");
  if (normalized === "/dashboard/profile") return tripPath("perfil");

  const publication = normalized.match(/^\/dashboard\/publications\/([^/]+)$/);
  if (publication) {
    const publicacion = decodeURIComponent(publication[1]);
    if (params.get("mode") === "details") return tripPath("detalle", { publicacion });
    return tripPath("compra", { publicacion });
  }

  return "/";
}

export function isTravelerReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return false;
  let url: URL;
  try {
    url = new URL(value, "http://larutica.local");
  } catch {
    return false;
  }
  if (url.origin !== "http://larutica.local" || url.pathname !== "/") return false;
  return parseTrip(url.searchParams.get("viaje")) !== null;
}

export function loginDestination(role: string, next: string | null) {
  if (role === "Viajero" && next && isTravelerReturnPath(next)) return next;
  return "/dashboard";
}
