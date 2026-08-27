import type { TransportRoute } from "@/modules/transport/routes/models/Route";

export function publishedRoutes(routes: TransportRoute[]) {
  return routes.filter((route) => route.status === "Publicada");
}

export function matchRoutes(routes: TransportRoute[], query: string) {
  const published = publishedRoutes(routes);
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return published;
  return published.filter((route) =>
    [route.origin, route.destination, route.excerpt, route.vehicleType]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalized),
  );
}
