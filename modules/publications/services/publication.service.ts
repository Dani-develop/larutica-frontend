import { apiFetch } from "@/lib/api/browser-fetch";
import type {
  ApiErrorResponse,
  CreateDepartureInput,
  CreatePublicationInput,
  DeletePublicationResponse,
  Publication,
  PublicationApiResponse,
  PublicationDeparture,
  PublicationDepartureApiResponse,
  PublicationDeparturesApiResponse,
  PublicationsApiResponse,
  UpdateDepartureInput,
  UpdatePublicationInput,
} from "../types/publication.types";

async function readApiError(
  response: Response,
): Promise<string> {
  try {
    const body =
      (await response.json()) as
        ApiErrorResponse;

    if (body.error) {
      return body.error;
    }
  } catch {
    // Ignorar respuestas no JSON.
  }

  return "Ocurrió un error al procesar la solicitud.";
}

async function ensureOk(
  response: Response,
) {
  if (response.ok) {
    return;
  }

  const message =
    await readApiError(
      response,
    );

  throw new Error(message);
}

export async function getMyPublications(): Promise<
  Publication[]
> {
  const response =
    await apiFetch(
      "/api/publications/me",
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
        cache: "no-store",
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationsApiResponse;

  return body.data ?? [];
}

export async function getPublicationById(
  id: string,
): Promise<Publication> {
  const response =
    await apiFetch(
      `/api/publications/${id}`,
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
        cache: "no-store",
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationApiResponse;

  return body.data;
}

export async function createPublication(
  input: CreatePublicationInput,
): Promise<Publication> {
  const response =
    await apiFetch(
      "/api/publications",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationApiResponse;

  return body.data;
}

export async function updatePublication(
  id: string,
  input: UpdatePublicationInput,
): Promise<Publication> {
  const response =
    await apiFetch(
      `/api/publications/${id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationApiResponse;

  return body.data;
}

export async function deletePublication(
  id: string,
): Promise<
  DeletePublicationResponse["data"]
> {
  const response =
    await apiFetch(
      `/api/publications/${id}`,
      {
        method: "DELETE",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      DeletePublicationResponse;

  return body.data;
}

export async function getPublicationDepartures(
  publicationId: string,
): Promise<PublicationDeparture[]> {
  const response =
    await apiFetch(
      `/api/publications/${publicationId}/departures`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },

        cache: "no-store",
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationDeparturesApiResponse;

  return body.data ?? [];
}

export async function createPublicationDeparture(
  publicationId: string,
  input: CreateDepartureInput,
): Promise<PublicationDeparture> {
  const response =
    await apiFetch(
      `/api/publications/${publicationId}/departures`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationDepartureApiResponse;

  return body.data;
}

export async function updatePublicationDeparture(
  publicationId: string,
  departureId: string,
  input: UpdateDepartureInput,
): Promise<PublicationDeparture> {
  const response =
    await apiFetch(
      `/api/publications/${publicationId}/departures/${departureId}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationDepartureApiResponse;

  return body.data;
}

export async function cancelPublicationDeparture(
  publicationId: string,
  departureId: string,
): Promise<PublicationDeparture> {
  const response =
    await apiFetch(
      `/api/publications/${publicationId}/departures/${departureId}`,
      {
        method: "DELETE",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  await ensureOk(response);

  const body =
    (await response.json()) as
      PublicationDepartureApiResponse;

  return body.data;
}