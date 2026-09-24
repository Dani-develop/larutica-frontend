// Traduce los errores de WebAuthn del navegador a mensajes para el usuario.
export function passkeyErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (error.name === "NotAllowedError" || error.name === "AbortError") {
    return "Se canceló la operación con la passkey o expiró el tiempo de espera.";
  }
  if (error.name === "InvalidStateError") {
    return "Este dispositivo ya tiene una passkey registrada para tu cuenta.";
  }
  if (error.name === "NotSupportedError" || error.name === "SecurityError") {
    return "Este navegador o sitio no admite passkeys.";
  }
  return error.message || fallback;
}
