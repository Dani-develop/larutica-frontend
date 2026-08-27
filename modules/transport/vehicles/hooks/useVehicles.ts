"use client";

import { useVehiclesStore } from "../store/vehiclesStore";

export function useVehicles() {
  return useVehiclesStore();
}
