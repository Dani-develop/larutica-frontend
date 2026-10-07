import { apiErrorResponse, assertSameOrigin, ApiError } from "@/lib/api/errors";
import { askAssistant, type AssistantMessage } from "@/lib/ai/deepseek-client";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json();
    const messages =
      body && typeof body === "object" && "messages" in body
        ? (body as { messages: unknown }).messages
        : null;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ApiError("Se requiere al menos un mensaje.", 400);
    }

    const reply = await askAssistant(messages as AssistantMessage[]);
    return Response.json({ reply }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
