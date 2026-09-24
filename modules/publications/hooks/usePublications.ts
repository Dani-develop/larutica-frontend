"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createPublication,
  deletePublication,
  getMyPublications,
  getPublicationById,
  updatePublication,
} from "../services/publication.service";

import type {
  CreatePublicationInput,
  Publication,
  UpdatePublicationInput,
} from "../types/publication.types";

type UsePublicationsState = {
  publications: Publication[];
  loading: boolean;
  error: string | null;
};

export function usePublications() {
  const [
    state,
    setState,
  ] =
    useState<UsePublicationsState>({
      publications: [],
      loading: true,
      error: null,
    });

  const loadPublications =
    useCallback(
      async () => {
        setState((previous) => ({
          ...previous,
          loading: true,
          error: null,
        }));

        try {
          const publications =
            await getMyPublications();

          setState({
            publications,
            loading: false,
            error: null,
          });
        } catch (error) {
          setState({
            publications: [],
            loading: false,
            error:
              error instanceof
              Error
                ? error.message
                : "No se pudieron cargar las publicaciones.",
          });
        }
      },
      [],
    );

  useEffect(() => {
    void loadPublications();
  }, [loadPublications]);

  const getById =
    useCallback(
      async (
        id: string,
      ): Promise<Publication> => {
        try {
          return await getPublicationById(
            id,
          );
        } catch (error) {
          throw error instanceof
            Error
            ? error
            : new Error(
                "No se pudo consultar la publicación.",
              );
        }
      },
      [],
    );

  const create =
    useCallback(
      async (
        input: CreatePublicationInput,
      ): Promise<Publication> => {
        const created =
          await createPublication(
            input,
          );

        setState(
          (previous) => ({
            ...previous,

            publications: [
              created,
              ...previous.publications,
            ],
          }),
        );

        return created;
      },
      [],
    );

  const update =
    useCallback(
      async (
        id: string,
        input: UpdatePublicationInput,
      ): Promise<Publication> => {
        const updated =
          await updatePublication(
            id,
            input,
          );

        setState(
          (previous) => ({
            ...previous,

            publications:
              previous.publications.map(
                (publication) =>
                  publication.id ===
                  id
                    ? updated
                    : publication,
              ),
          }),
        );

        return updated;
      },
      [],
    );

  const remove =
    useCallback(
      async (
        id: string,
      ): Promise<void> => {
        await deletePublication(
          id,
        );

        setState(
          (previous) => ({
            ...previous,

            publications:
              previous.publications.map(
                (publication) =>
                  publication.id ===
                  id
                    ? {
                        ...publication,
                        status:
                          "INACTIVE",
                      }
                    : publication,
              ),
          }),
        );
      },
      [],
    );

  return {
    publications:
      state.publications,

    loading:
      state.loading,

    error:
      state.error,

    reload:
      loadPublications,

    getById,

    create,

    update,

    remove,
  };
}