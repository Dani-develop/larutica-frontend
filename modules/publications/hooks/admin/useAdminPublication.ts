"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminPublication,
  reviewAdminPublication,
  type AdminPublication,
} from "../../services/admin/admin-publication.service";

export function useAdminPublication(
  publicationId: string,
) {
  const [
    publication,
    setPublication,
  ] =
    useState<
      AdminPublication | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    reviewing,
    setReviewing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const loadPublication =
    useCallback(
      async () => {
        if (!publicationId) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError(null);

          const data =
            await getAdminPublication(
              publicationId,
            );

          setPublication(
            data,
          );
        } catch (cause) {
          setError(
            cause instanceof
            Error
              ? cause.message
              : "No se pudo cargar la publicación.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        publicationId,
      ],
    );

  useEffect(
    () => {
      queueMicrotask(() => { void loadPublication(); });
    },
    [
      loadPublication,
    ],
  );

  const review =
    async (
      status:
        | "APPROVED"
        | "REJECTED",
    ) => {
      if (!publication) {
        return;
      }

      try {
        setReviewing(true);
        setError(null);

        const newStatus =
          await reviewAdminPublication(
            publication.id,
            status,
          );

        setPublication(
          (
            current,
          ) =>
            current
              ? {
                  ...current,
                  status:
                    newStatus,
                }
              : current,
        );
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "No se pudo completar la revisión.";

        setError(
          message,
        );

        throw cause;
      } finally {
        setReviewing(false);
      }
    };

  return {
    publication,
    loading,
    reviewing,
    error,
    loadPublication,

    approve:
      () =>
        review(
          "APPROVED",
        ),

    reject:
      () =>
        review(
          "REJECTED",
        ),
  };
}