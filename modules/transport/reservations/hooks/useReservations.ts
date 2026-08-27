"use client";

import { useReservationsStore } from "../store/reservationsStore";

export function useReservations() {
  return useReservationsStore();
}
