"use client";

import { useSyncExternalStore } from "react";
import { seedVehicles } from "../data/seedVehicles";
import type { TransportVehicle, VehicleInput } from "../models/Vehicle";

let vehiclesStore: TransportVehicle[] = [...seedVehicles];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return vehiclesStore;
}

function createId() {
  return `vehicle-${Date.now().toString(36)}`;
}

export function getVehicleById(id: string) {
  return vehiclesStore.find((item) => item.id === id);
}

export function createVehicle(input: VehicleInput): TransportVehicle {
  const now = new Date().toISOString();
  const next: TransportVehicle = {
    ...input,
    id: createId(),
    name: input.name.trim() || "Vehículo sin nombre",
    plate: input.plate.trim(),
    features: input.features.filter((item) => item.trim()),
    createdAt: now,
    updatedAt: now,
  };
  vehiclesStore = [next, ...vehiclesStore];
  emit();
  return next;
}

export function updateVehicle(
  id: string,
  input: VehicleInput,
): TransportVehicle | undefined {
  const current = vehiclesStore.find((item) => item.id === id);
  if (!current) return undefined;

  const updated: TransportVehicle = {
    ...current,
    ...input,
    name: input.name.trim() || "Vehículo sin nombre",
    plate: input.plate.trim(),
    features: input.features.filter((value) => value.trim()),
    updatedAt: new Date().toISOString(),
  };

  vehiclesStore = vehiclesStore.map((item) => (item.id === id ? updated : item));
  emit();
  return updated;
}

export function removeVehicle(id: string) {
  vehiclesStore = vehiclesStore.filter((item) => item.id !== id);
  emit();
}

export function useVehiclesStore() {
  const vehicles = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    vehicles,
    getById: getVehicleById,
    create: createVehicle,
    update: updateVehicle,
    remove: removeVehicle,
  };
}
