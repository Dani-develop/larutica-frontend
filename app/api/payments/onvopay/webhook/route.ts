import { isValidWebhookSecret } from "@/lib/payments/onvo";
import { handleOnvoWebhook } from "@/lib/payments/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

// OnvoPAY llama a esta ruta directamente: no hay sesión ni origen del navegador, solo el secreto compartido.
export async function POST(request: Request) {
  if (!isValidWebhookSecret(request.headers.get("x-webhook-secret"))) {
    return Response.json({ error: "El webhook de OnvoPAY no es válido." }, { status: 401 });
  }
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  try {
    await handleOnvoWebhook(getSupabaseAdminClient(), payload);
    return Response.json({ received: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    // Un 500 hace que Onvo reintente el evento.
    console.error("Error procesando el webhook de OnvoPAY", error);
    return Response.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
