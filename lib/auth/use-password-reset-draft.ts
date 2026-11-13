"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readPasswordResetDraft, type PasswordResetDraft } from "./password-reset-client";

const subscribe = () => () => {};

/**
 * Lee el borrador de recuperación de contraseña desde sessionStorage sin
 * provocar diferencias de hidratación.
 *
 * - `undefined`: todavía no hidrató el cliente (el servidor no puede leer sessionStorage).
 * - `null`: no hay un borrador válido.
 * - objeto: borrador leído una sola vez al hidratar. Se mantiene estable aunque se
 *   limpie el almacenamiento después, igual que la lectura única al montar.
 */
export function usePasswordResetDraft(): PasswordResetDraft | null | undefined {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return useMemo(() => (hydrated ? readPasswordResetDraft() : undefined), [hydrated]);
}
