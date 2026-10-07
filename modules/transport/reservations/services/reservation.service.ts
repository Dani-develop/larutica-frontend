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
  publicationId: string
  publicationTitle: string
  destination: string | null
  rating: number | null
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
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message ??
      body?.error ??
      'Ocurrió un error al procesar la solicitud.'

    throw new Error(message)
  }

  return body
}

export async function listReservations(): Promise<Reservation[]> {
  const response = await fetch('/api/reservations', {
    method: 'GET',
    credentials: 'include',
  })
  const result = await parseResponse<ApiResponse<Reservation[]>>(response)
  return result.data
}

export async function createReservation(
  payload: CreateReservationPayload,
): Promise<Reservation> {
  const response = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const result = await parseResponse<ApiResponse<Reservation>>(response)
  return result.data
}

export async function getReservation(id: string): Promise<Reservation> {
  const response = await fetch(`/api/reservations/${id}`, {
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
  const response = await fetch(`/api/reservations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const result = await parseResponse<ApiResponse<Reservation>>(response)
  return result.data
}

export async function deleteReservation(id: string): Promise<void> {
  const response = await fetch(`/api/reservations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseResponse(response)
}
