"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminAgencies,
  type AdminAgencyFilters,
} from "../../services/admin/admin-agency.service";

import type {
  Agency,
} from "../../types/agency.types";

export function useAdminAgencies(
  filters: AdminAgencyFilters = {},
) {
  const { status, search } = filters;
  const [
    agencies,
    setAgencies,
  ] =
    useState<Agency[]>(
      [],
    );

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

  const loadAgencies =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const data =
            await getAdminAgencies(
              { status, search },
            );

          setAgencies(
            data,
          );
        } catch (
          cause
        ) {
          const message =
            cause instanceof
            Error
              ? cause.message
              : "No se pudieron cargar las agencias.";

          setError(
            message,
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        status,
        search,
      ],
    );

  useEffect(
    () => {
      queueMicrotask(() => { void loadAgencies(); });
    },
    [
      loadAgencies,
    ],
  );

  return {
    agencies,
    loading,
    error,
    loadAgencies,
  };
}