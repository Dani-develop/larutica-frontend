"use client";

import { useSyncExternalStore } from "react";
import { seedRoutes } from "../data/seedRoutes";
import type { RouteInput, TransportRoute } from "../models/Route";

let routesStore: TransportRoute[] = [...seedRoutes];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return routesStore;
}

function createId() {
  return `route-${Date.now().toString(36)}`;
}

export function getRouteById(id: string) {
  return routesStore.find((item) => item.id === id);
}

export function createRoute(input: RouteInput): TransportRoute {
  const now = new Date().toISOString();
  const next: TransportRoute = {
    ...input,
    id: createId(),
    includes: input.includes.filter((item) => item.trim()),
    createdAt: now,
    updatedAt: now,
  };
  routesStore = [next, ...routesStore];
  emit();
  return next;
}

export function updateRoute(
  id: string,
  input: RouteInput,
): TransportRoute | undefined {
  const current = routesStore.find((item) => item.id === id);
  if (!current) return undefined;

  const updated: TransportRoute = {
    ...current,
    ...input,
    includes: input.includes.filter((value) => value.trim()),
    updatedAt: new Date().toISOString(),
  };

  routesStore = routesStore.map((item) => (item.id === id ? updated : item));
  emit();
  return updated;
}

export function removeRoute(id: string) {
  routesStore = routesStore.filter((item) => item.id !== id);
  emit();
}

export function useRoutesStore() {
  const routes = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    routes,
    getById: getRouteById,
    create: createRoute,
    update: updateRoute,
    remove: removeRoute,
  };
}
