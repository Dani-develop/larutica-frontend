"use client";

import { usePublicationsStore } from "../store/publicationsStore";

/** Hook de acceso al CRUD de publicaciones (store en memoria de sesión). */
export function usePublications() {
  return usePublicationsStore();
}
