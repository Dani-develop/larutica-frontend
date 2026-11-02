export function responseErrorMessage(payload: unknown, fallback = 'No se pudo completar la solicitud.'): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}
