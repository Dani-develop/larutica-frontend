import { apiFetch } from "@/lib/api/browser-fetch";
import type { TravelerPublication } from "@/modules/traveler/types/traveler-publication.types";

type ApiResponse<T> = { data: T };

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
  if (!response.ok) {
    throw new Error(
      body?.error ?? (response.status === 404 ? "Esta función todavía no está disponible. Intenta más tarde." : "No pudimos cargar esta información. Intenta de nuevo."),
    );
  }
  return body as unknown as T;
}

export async function listTravelerPublications(provider?: string): Promise<TravelerPublication[]> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  const response = await apiFetch(`/api/traveler/publications${query}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await parseResponse<ApiResponse<TravelerPublication[]>>(response);
  return result.data;
}

export async function getTravelerPublication(id: string): Promise<TravelerPublication> {
  const response = await apiFetch(`/api/traveler/publications?id=${encodeURIComponent(id)}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await parseResponse<ApiResponse<TravelerPublication[]>>(response);
  const publication = result.data[0];
  if (!publication) throw new Error("La publicación no está disponible.");
  return publication;
}

export async function listSavedPublications(): Promise<TravelerPublication[]> {
  const response = await apiFetch("/api/traveler/saved", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await parseResponse<ApiResponse<TravelerPublication[]>>(response);
  return result.data;
}

export async function setPublicationSaved(publicationId: string, saved: boolean): Promise<void> {
  const response = saved
    ? await apiFetch("/api/traveler/saved", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicationId }),
      })
    : await apiFetch(`/api/traveler/saved/${encodeURIComponent(publicationId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
  await parseResponse(response);
}

export async function rateReservation(reservationId: string, rating: number): Promise<number> {
  const response = await apiFetch(`/api/reservations/${encodeURIComponent(reservationId)}/rating`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  const result = await parseResponse<ApiResponse<{ rating: number }>>(response);
  return result.data.rating;
}

// Both public discovery and Mi viaje use this same public projection.
export async function listCatalogPublications(): Promise<TravelerPublication[]> {
  const response = await apiFetch('/api/catalog');
  const result = await parseResponse<ApiResponse<import('@/modules/booking/types').Experience[]>>(response);
  return result.data.map(p => ({ id:p.id, title:p.title, description:p.description, destination:p.destination,
    mainImageUrl:p.image, pricePerPerson:p.price, durationMinutes:p.duration, included:p.included,
    notIncluded:p.notIncluded, meetingPoint:p.meetingPoint, journey:p.journey, defaultCapacity:0, languages:[],
    serviceType:p.serviceType as TravelerPublication['serviceType'], departures:p.departures,
    providerName:p.agency, providerSlug:p.agency.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }));
}
export async function listSavedPublicationIds(): Promise<string[]> {
  const response = await apiFetch('/api/traveler/saved?ids=1', { credentials:'same-origin' });
  return (await parseResponse<ApiResponse<string[]>>(response)).data;
}
