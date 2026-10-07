import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";

type ApiResponse<T> = { data: T };

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error ?? "Ocurrió un error al procesar la solicitud.",
    );
  }
  return body;
}

export async function listTravelerPublications(provider?: string): Promise<TravelerPublication[]> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  const response = await fetch(`/api/traveler/publications${query}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await parseResponse<ApiResponse<TravelerPublication[]>>(response);
  return result.data;
}

export async function getTravelerPublication(id: string): Promise<TravelerPublication> {
  const response = await fetch(`/api/traveler/publications?id=${encodeURIComponent(id)}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await parseResponse<ApiResponse<TravelerPublication[]>>(response);
  const publication = result.data[0];
  if (!publication) throw new Error("La publicación no está disponible.");
  return publication;
}

export async function listSavedPublications(): Promise<TravelerPublication[]> {
  const response = await fetch("/api/traveler/saved", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await parseResponse<ApiResponse<TravelerPublication[]>>(response);
  return result.data;
}

export async function setPublicationSaved(publicationId: string, saved: boolean): Promise<void> {
  const response = saved
    ? await fetch("/api/traveler/saved", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicationId }),
      })
    : await fetch(`/api/traveler/saved/${encodeURIComponent(publicationId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
  await parseResponse(response);
}

export async function rateReservation(reservationId: string, rating: number): Promise<number> {
  const response = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/rating`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  const result = await parseResponse<ApiResponse<{ rating: number }>>(response);
  return result.data.rating;
}
