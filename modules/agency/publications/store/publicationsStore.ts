"use client";

import { useSyncExternalStore } from "react";
import { seedPublications } from "../data/seedPublications";
import type {
  Publication,
  PublicationInput,
} from "../models/Publication";

let publicationsStore: Publication[] = [...seedPublications];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return publicationsStore;
}

function createId() {
  return `pub-${Date.now().toString(36)}`;
}

export function getPublicationById(id: string) {
  return publicationsStore.find((item) => item.id === id);
}

export function createPublication(input: PublicationInput): Publication {
  const now = new Date().toISOString();
  const next: Publication = {
    ...input,
    id: createId(),
    activities: input.activities.filter((item) => item.trim()),
    includes: input.includes.filter((item) => item.trim()),
    createdAt: now,
    updatedAt: now,
  };
  publicationsStore = [next, ...publicationsStore];
  emit();
  return next;
}

export function updatePublication(
  id: string,
  input: PublicationInput,
): Publication | undefined {
  const current = publicationsStore.find((item) => item.id === id);
  if (!current) return undefined;

  const updated: Publication = {
    ...current,
    ...input,
    activities: input.activities.filter((value) => value.trim()),
    includes: input.includes.filter((value) => value.trim()),
    updatedAt: new Date().toISOString(),
  };

  publicationsStore = publicationsStore.map((item) =>
    item.id === id ? updated : item,
  );
  emit();
  return updated;
}

export function removePublication(id: string) {
  publicationsStore = publicationsStore.filter((item) => item.id !== id);
  emit();
}

export function usePublicationsStore() {
  const publications = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  return {
    publications,
    getById: getPublicationById,
    create: createPublication,
    update: updatePublication,
    remove: removePublication,
  };
}
