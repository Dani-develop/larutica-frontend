import type {
  Agency,
  SaveAgencyPayload,
} from '../types/agency.types'

interface ApiResponse<T> {
  data: T
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
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

export async function getMyAgency(): Promise<Agency | null> {
  const response = await fetch('/api/agencies/me', {
    method: 'GET',
    credentials: 'include',
  })

  const result = await parseResponse<ApiResponse<Agency | null>>(
    response,
  )

  return result.data
}

export async function createAgency(
  payload: SaveAgencyPayload,
): Promise<Agency> {
  const response = await fetch('/api/agencies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const result = await parseResponse<ApiResponse<Agency>>(
    response,
  )

  return result.data
}

export async function updateMyAgency(
  payload: SaveAgencyPayload,
): Promise<Agency> {
  const response = await fetch('/api/agencies/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const result = await parseResponse<ApiResponse<Agency>>(
    response,
  )

  return result.data
}

export async function deleteMyAgency(): Promise<void> {
  const response = await fetch('/api/agencies/me', {
    method: 'DELETE',
    credentials: 'include',
  })

  await parseResponse(response)
}