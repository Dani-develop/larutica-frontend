export const VEHICLE_TYPES = ["Microbús", "Van", "Privado"] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export type VehicleStatus = "Disponible" | "En mantenimiento";

export type TransportVehicle = {
  id: string;
  name: string;
  type: VehicleType;
  seats: number;
  plate: string;
  features: string[];
  photoUrl: string;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
};

export type VehicleInput = Omit<
  TransportVehicle,
  "id" | "createdAt" | "updatedAt"
>;

export function vehicleLabel(
  vehicle: Pick<TransportVehicle, "name" | "type" | "seats">,
) {
  return `${vehicle.name} · ${vehicle.type} · ${vehicle.seats} asientos`;
}

export const emptyVehicleInput: VehicleInput = {
  name: "",
  type: "Van",
  seats: 8,
  plate: "",
  features: [""],
  photoUrl:
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
  status: "Disponible",
};
