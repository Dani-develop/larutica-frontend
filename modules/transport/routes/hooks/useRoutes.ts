"use client";

import { useRoutesStore } from "../store/routesStore";

export function useRoutes() {
  return useRoutesStore();
}
