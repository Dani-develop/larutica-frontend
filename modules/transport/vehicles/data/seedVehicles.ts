import type { TransportVehicle } from "../models/Vehicle";

export const seedVehicles: TransportVehicle[] = [
  {
    id: "vehicle-van-01",
    name: "Van Nosara",
    type: "Van",
    seats: 8,
    plate: "TS-2041",
    features: ["Aire acondicionado", "Una maleta por persona", "Wi-Fi"],
    photoUrl:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    status: "Disponible",
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-18T12:00:00.000Z",
  },
  {
    id: "vehicle-bus-02",
    name: "Microbús San José",
    type: "Microbús",
    seats: 12,
    plate: "TS-1188",
    features: ["Aire acondicionado", "Salida matutina", "Conductor local"],
    photoUrl:
      "https://images.unsplash.com/photo-1544620341-11cb2cd7c233?auto=format&fit=crop&w=1200&q=80",
    status: "Disponible",
    createdAt: "2026-08-08T09:00:00.000Z",
    updatedAt: "2026-08-16T11:00:00.000Z",
  },
  {
    id: "vehicle-suv-03",
    name: "SUV Tamarindo",
    type: "Privado",
    seats: 4,
    plate: "TS-3302",
    features: ["Vehículo privado", "Aire acondicionado", "Horario a convenir"],
    photoUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    status: "En mantenimiento",
    createdAt: "2026-08-19T08:00:00.000Z",
    updatedAt: "2026-08-21T09:00:00.000Z",
  },
];
