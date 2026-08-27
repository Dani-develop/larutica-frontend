"use client";

import { useSyncExternalStore } from "react";
import type {
  ReservationInput,
  TransportReservation,
} from "../models/Reservation";

let reservationsStore: TransportReservation[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return reservationsStore;
}

function createId() {
  return `res-${Date.now().toString(36)}`;
}

export function createReservation(
  input: ReservationInput,
): TransportReservation {
  const next: TransportReservation = {
    ...input,
    id: createId(),
    createdAt: new Date().toISOString(),
  };
  reservationsStore = [next, ...reservationsStore];
  emit();
  return next;
}

export function getReservationById(id: string) {
  return reservationsStore.find((item) => item.id === id);
}

export function useReservationsStore() {
  const reservations = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  return {
    reservations,
    create: createReservation,
    getById: getReservationById,
  };
}
