"use client";

import { useUsersStore } from "../store/usersStore";

export function useUsers() {
  return useUsersStore();
}
