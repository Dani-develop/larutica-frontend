"use client";

import { useSyncExternalStore } from "react";
import type { DashboardRole } from "@/components/dashboard/dashboard-role-context";
import { seedUsers } from "../data/seedUsers";
import type { SystemUser, SystemUserInput } from "../models/User";

let usersStore: SystemUser[] = [...seedUsers];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return usersStore;
}

function createId() {
  return `user-${Date.now().toString(36)}`;
}

export function getUserById(id: string) {
  return usersStore.find((item) => item.id === id);
}

export function getUserByEmail(email: string) {
  return usersStore.find(
    (item) => item.email.toLowerCase() === email.toLowerCase(),
  );
}

export function getUserByRoleDemo(role: DashboardRole) {
  return usersStore.find((item) => item.role === role);
}

export function createUser(input: SystemUserInput): SystemUser {
  const now = new Date().toISOString();
  const next: SystemUser = {
    ...input,
    id: createId(),
    businessName:
      input.role === "Agencia" || input.role === "Transporte"
        ? input.businessName.trim()
        : "",
    createdAt: now,
    updatedAt: now,
  };
  usersStore = [next, ...usersStore];
  emit();
  return next;
}

export function updateUser(
  id: string,
  input: SystemUserInput,
): SystemUser | undefined {
  const current = usersStore.find((item) => item.id === id);
  if (!current) return undefined;

  const updated: SystemUser = {
    ...current,
    ...input,
    businessName:
      input.role === "Agencia" || input.role === "Transporte"
        ? input.businessName.trim()
        : "",
    updatedAt: new Date().toISOString(),
  };

  usersStore = usersStore.map((item) => (item.id === id ? updated : item));
  emit();
  return updated;
}

export function removeUser(id: string) {
  usersStore = usersStore.filter((item) => item.id !== id);
  emit();
}

export function useUsersStore() {
  const users = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    users,
    getById: getUserById,
    getByEmail: getUserByEmail,
    getByRoleDemo: getUserByRoleDemo,
    create: createUser,
    update: updateUser,
    remove: removeUser,
  };
}
