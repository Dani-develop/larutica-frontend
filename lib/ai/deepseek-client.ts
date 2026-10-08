import { ApiError } from "@/lib/api/errors";

export type AssistantMessage = { role: "system" | "user" | "assistant"; content: string };

export async function askAssistant(messages: AssistantMessage[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new ApiError("El asistente de IA no está configurado.", 503);
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: "deepseek-chat", messages, stream: false }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new ApiError("El asistente de IA no está disponible en este momento.", 502);
  }

  const data: unknown = await response.json();
  const content =
    data &&
    typeof data === "object" &&
    "choices" in data &&
    Array.isArray((data as { choices: unknown }).choices) &&
    (data as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message
      ?.content;

  if (typeof content !== "string") {
    throw new ApiError("Respuesta inválida del asistente de IA.", 502);
  }

  return content;
}
