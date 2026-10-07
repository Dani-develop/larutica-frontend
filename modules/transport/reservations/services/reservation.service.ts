import { apiFetch } from "@/lib/api/browser-fetch";
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'PAST' | 'CANCELLED'

export type Reservation = {
  id: string
  passengerId: string
  departureId: string
  numberOfPeople: number
  unitPrice: number
  total: number
  status: ReservationStatus
  createdAt: string
  updatedAt: string
  departureStartAt: string
  departureStatus?: string
  rating?: number | null
  publicationId: string
  publicationTitle: string
  destination: string | null
  passengerName?: string
  passengerEmail?: string
  passengerPhone?: string | null
  agencyName?: string
  agencyPhone?: string | null
  agencyEmail?: string | null
  meetingPoint?: string | null
}

export type CreateReservationPayload = {
  departureId: string
  numberOfPeople: number
}

export type UpdateReservationPayload = {
  numberOfPeople?: number
  status?: 'CONFIRMED' | 'CANCELLED'
}

interface ApiResponse<T> {
  data: T
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { message?: string; error?: string } | null

  if (!response.ok) {
    const message =
      body?.message ??
      body?.error ??
      'Ocurrió un error al procesar la solicitud.'

    throw new Error(message)
  }

  return body as unknown as T
}

export async function listReservations(options: { mine?: boolean; departureId?: string } = {}): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (options.mine) params.set('scope', 'mine');
  if (options.departureId) params.set('departureId', options.departureId);
  const response = await apiFetch(`/api/reservations${params.size ? `?${params}` : ''}`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await parseResponse<ApiResponse<Reservation[]>>(response)
  return result.data
}

export async function createReservation(
  payload: CreateReservationPayload,
): Promise<Reservation> {
  const response = await apiFetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const result = await parseResponse<ApiResponse<Reservation>>(response)
  return result.data
}

export async function getReservation(id: string): Promise<Reservation> {
  const response = await apiFetch(`/api/reservations/${id}`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await parseResponse<ApiResponse<Reservation>>(response)
  return result.data
}

export async function updateReservation(
  id: string,
  payload: UpdateReservationPayload,
): Promise<Reservation> {
  const response = await apiFetch(`/api/reservations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const result = await parseResponse<ApiResponse<Reservation>>(response)
  return result.data
}

export async function deleteReservation(id: string): Promise<void> {
  const response = await apiFetch(`/api/reservations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseResponse(response)
}
