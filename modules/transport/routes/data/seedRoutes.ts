import type { TransportRoute } from "../models/Route";

export const seedRoutes: TransportRoute[] = [
  {
    id: "route-nosara-liberia-01",
    origin: "Nosara",
    destination: "Aeropuerto de Liberia",
    coverUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    excerpt:
      "Traslado compartido desde Nosara hasta el Aeropuerto de Liberia, con parada en el centro del pueblo.",
    includes: [
      "Recogida en Nosara",
      "Una maleta por persona",
      "Aire acondicionado",
      "Conductor local",
    ],
    duration: "1 h 30 min",
    vehicleId: "vehicle-van-01",
    vehicleType: "Van",
    seats: 8,
    priceUsd: 45,
    providerName: "Transportes Sol",
    status: "Publicada",
    createdAt: "2026-08-12T10:00:00.000Z",
    updatedAt: "2026-08-20T14:00:00.000Z",
  },
  {
    id: "route-sjo-fortuna-02",
    origin: "San José",
    destination: "La Fortuna",
    coverUrl:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    excerpt:
      "Microbús diario entre San José y La Fortuna, con salida por la mañana.",
    includes: [
      "Salida 8:00 a. m.",
      "Una maleta y un bolso",
      "Aire acondicionado",
    ],
    duration: "3 h 15 min",
    vehicleId: "vehicle-bus-02",
    vehicleType: "Microbús",
    seats: 12,
    priceUsd: 42,
    providerName: "Transportes Sol",
    status: "Publicada",
    createdAt: "2026-08-08T09:00:00.000Z",
    updatedAt: "2026-08-18T11:00:00.000Z",
  },
  {
    id: "route-liberia-tamarindo-03",
    origin: "Liberia",
    destination: "Tamarindo",
    coverUrl:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
    excerpt:
      "Traslado privado desde Liberia hasta Tamarindo, ideal para grupos pequeños.",
    includes: ["Vehículo privado", "Hasta 4 pasajeros", "Horario a convenir"],
    duration: "1 h 10 min",
    vehicleId: "vehicle-suv-03",
    vehicleType: "Privado",
    seats: 4,
    priceUsd: 35,
    providerName: "Transportes Sol",
    status: "En revisión",
    createdAt: "2026-08-19T08:00:00.000Z",
    updatedAt: "2026-08-21T09:30:00.000Z",
  },
];
