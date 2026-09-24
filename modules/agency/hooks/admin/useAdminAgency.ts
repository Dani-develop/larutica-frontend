"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminAgency,
  getAgencyVerificationDocument,
  reviewAgency,
} from "../../services/admin/admin-agency.service";

import type {
  Agency,
} from "../../types/agency.types";

export function useAdminAgency(
  agencyId: string,
) {
  const [
    agency,
    setAgency,
  ] =
    useState<
      Agency | null
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
    openingDocument,
    setOpeningDocument,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const loadAgency =
    useCallback(
      async () => {
        if (!agencyId) {
          setAgency(
            null,
          );

          setLoading(
            false,
          );

          return;
        }

        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const data =
            await getAdminAgency(
              agencyId,
            );

          setAgency(
            data,
          );
        } catch (
          cause
        ) {
          const message =
            cause instanceof
            Error
              ? cause.message
              : "No se pudo cargar la agencia.";

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
        agencyId,
      ],
    );

  useEffect(
    () => {
      void loadAgency();
    },
    [
      loadAgency,
    ],
  );

  const review =
    async (
      status:
        | "APPROVED"
        | "REJECTED",
    ) => {
      if (
        !agency
      ) {
        return;
      }

      try {
        setReviewing(
          true,
        );

        setError(
          null,
        );

        const newStatus =
          await reviewAgency(
            agency.id,
            status,
          );

        setAgency(
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

        return newStatus;
      } catch (
        cause
      ) {
        const message =
          cause instanceof
          Error
            ? cause.message
            : "No se pudo completar la revisión.";

        setError(
          message,
        );

        throw cause;
      } finally {
        setReviewing(
          false,
        );
      }
    };

  const openDocument =
    async () => {
      if (
        !agency
      ) {
        return;
      }

      try {
        setOpeningDocument(
          true,
        );

        setError(
          null,
        );

        const result =
          await getAgencyVerificationDocument(
            agency.id,
          );

        window.open(
          result.url,
          "_blank",
          "noopener,noreferrer",
        );
      } catch (
        cause
      ) {
        const message =
          cause instanceof
          Error
            ? cause.message
            : "No se pudo abrir el documento.";

        setError(
          message,
        );
      } finally {
        setOpeningDocument(
          false,
        );
      }
    };

  return {
    agency,

    loading,
    reviewing,
    openingDocument,

    error,

    loadAgency,
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

    openDocument,
  };
}