"use client";

import { useSyncExternalStore } from "react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";

const subscribe = () => () => {};

// En el servidor no hay WebAuthn; en el cliente se consulta al navegador sin
// provocar diferencias de hidratación.
export function useWebAuthnSupport() {
  return useSyncExternalStore(subscribe, browserSupportsWebAuthn, () => false);
}
