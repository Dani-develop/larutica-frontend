export type RouteStatus = "Publicada" | "Borrador" | "En revisión";

export const ROUTE_PLACES = [
  "Nosara",
  "Aeropuerto de Liberia",
  "San José",
  "La Fortuna",
  "Liberia",
  "Tamarindo",
  "Playas del Coco",
  "Monteverde",
] as const;

export type TransportRoute = {
  id: string;
  origin: string;
  destination: string;
  coverUrl: string;
  excerpt: string;
  includes: string[];
  duration: string;
  vehicleId: string;
  vehicleType: string;
  seats: number;
  priceUsd: number;
  providerName: string;
  status: RouteStatus;
  createdAt: string;
  updatedAt: string;
};

export type RouteInput = Omit<TransportRoute, "id" | "createdAt" | "updatedAt">;

export function routeTitle(
  route: Pick<TransportRoute, "origin" | "destination">,
) {
  return `${route.origin} → ${route.destination}`;
}

export const emptyRouteInput: RouteInput = {
  origin: "Nosara",
  destination: "Aeropuerto de Liberia",
  coverUrl:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  excerpt: "",
  includes: [""],
  duration: "1 h 30 min",
  vehicleId: "vehicle-van-01",
  vehicleType: "Van",
  seats: 8,
  priceUsd: 45,
  providerName: "Transportes Sol",
  status: "Borrador",
};
