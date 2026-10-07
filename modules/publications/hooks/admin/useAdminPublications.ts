"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminPublications,
  type AdminPublication,
  type AdminPublicationFilters,
} from "../../services/admin/admin-publication.service";

export function useAdminPublications(
  filters:
    AdminPublicationFilters = {},
) {
  const { status, search } = filters;
  const [
    publications,
    setPublications,
  ] =
    useState<
      AdminPublication[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const loadPublications =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const data =
            await getAdminPublications(
              { status, search },
            );

          setPublications(
            data,
          );
        } catch (cause) {
          setError(
            cause instanceof
            Error
              ? cause.message
              : "No se pudieron cargar las publicaciones.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        status,
        search,
      ],
    );

  useEffect(
    () => {
      queueMicrotask(() => { void loadPublications(); });
    },
    [
      loadPublications,
    ],
  );

  return {
    publications,
    loading,
    error,
    loadPublications,
  };
}