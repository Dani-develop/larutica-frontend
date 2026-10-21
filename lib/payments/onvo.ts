import { timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/errors";

const ONVO_BASE_URL = "https://api.onvopay.com/v1";

export type PaymentStatus = "pending" | "paid" | "failed" | "canceled" | "expired" | "refunded";

type OnvoResponse = {
  id?: string;
  status?: string;
  message?: string | string[];
  error?: string;
};

function secretKey(): string {
  const key = process.env.ONVO_TEST_API_KEY?.trim() || process.env.ONVO_API_KEY?.trim();
  if (!key) {
    throw new ApiError("Los pagos no están disponibles por el momento.", 503);
  }
  if (key.includes("publishable_key")) {
    console.error("OnvoPAY requiere una secret key en el servidor, no la publishable key.");
    throw new ApiError("Los pagos no están disponibles por el momento.", 503);
  }
  return key;
}

export function getOnvoPublishableKey(): string {
  const key = (process.env.ONVO_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_ONVO_PUBLISHABLE_KEY)?.trim();
  if (!key || !key.includes("publishable_key")) {
    throw new ApiError("Los pagos no están disponibles por el momento.", 503);
  }
  return key;
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(amount: number): number {
  return Number((amount / 100).toFixed(2));
}

function errorMessage(data: OnvoResponse): string | undefined {
  return Array.isArray(data.message) ? data.message.join(", ") : data.message ?? data.error;
}

async function onvoRequest<T extends OnvoResponse>(path: string, init: RequestInit, failure: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${ONVO_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("OnvoPAY no respondió", error);
    throw new ApiError("No pudimos comunicarnos con el procesador de pagos. Intenta de nuevo.", 502);
  }
  const data = await response.json().catch(() => ({})) as T;
  if (!response.ok) {
    console.error("OnvoPAY rechazó la solicitud", response.status, errorMessage(data));
    throw new ApiError(failure, 502);
  }
  return data;
}

export type OnvoPaymentIntent = { id: string; status: string; amount?: number; currency?: string };

export async function createOnvoPaymentIntent(input: {
  amount: number;
  currency: "USD" | "CRC";
  description: string;
  metadata: Record<string, string | number>;
}): Promise<OnvoPaymentIntent> {
  const data = await onvoRequest<OnvoResponse & { amount?: number; currency?: string }>("/payment-intents", {
    method: "POST",
    body: JSON.stringify({
      amount: toMinorUnits(input.amount),
      currency: input.currency,
      description: input.description,
      metadata: input.metadata,
    }),
  }, "No pudimos preparar el pago. Intenta de nuevo.");
  if (!data.id) throw new ApiError("No pudimos preparar el pago. Intenta de nuevo.", 502);
  return { id: data.id, status: data.status ?? "", amount: data.amount, currency: data.currency };
}

export async function fetchOnvoPaymentIntent(paymentIntentId: string): Promise<OnvoPaymentIntent> {
  const data = await onvoRequest<OnvoResponse & { amount?: number; currency?: string }>(
    `/payment-intents/${encodeURIComponent(paymentIntentId)}`,
    { method: "GET" },
    "No pudimos consultar el pago. Intenta de nuevo.",
  );
  if (!data.id) throw new ApiError("No pudimos consultar el pago. Intenta de nuevo.", 502);
  return { id: data.id, status: data.status ?? "", amount: data.amount, currency: data.currency };
}

export async function createOnvoRefund(paymentIntentId: string, amount: number): Promise<{ id?: string; status?: string }> {
  return onvoRequest<OnvoResponse>("/refunds", {
    method: "POST",
    body: JSON.stringify({ paymentIntentId, amount: toMinorUnits(amount) }),
  }, "No pudimos procesar el reembolso.");
}

export function mapOnvoStatus(status?: string): PaymentStatus {
  const value = status?.toLowerCase() ?? "";
  if (/paid|succeeded|success|completed|^complete$/.test(value)) return "paid";
  if (value.includes("cancel")) return "canceled";
  if (value.includes("fail")) return "failed";
  if (value.includes("expir")) return "expired";
  return "pending";
}

export function mapOnvoEvent(eventType: string | undefined, status?: string): PaymentStatus {
  if (eventType === "payment-intent.succeeded" || eventType === "checkout-session.succeeded") return "paid";
  if (eventType === "payment-intent.failed") return "failed";
  if (eventType === "payment-intent.deferred") return "pending";
  return mapOnvoStatus(status);
}

/** Compara el secreto del webhook sin revelar, por tiempo, cuántos caracteres coinciden. */
export function isValidWebhookSecret(supplied: string | null): boolean {
  const expected = process.env.ONVO_WEBHOOK_SECRET?.trim();
  if (!expected) {
    console.error("ONVO_WEBHOOK_SECRET no está configurado.");
    return false;
  }
  const a = Buffer.from(supplied ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function extractString(payload: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[key];
    }, payload);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function extractNumber(payload: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[key];
    }, payload);
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}
