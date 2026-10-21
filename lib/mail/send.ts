import type { Transporter } from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  requireTLS: boolean;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
};

export type MailDeliveryResult =
  | { status: "sent"; messageId?: string }
  | { status: "failed"; code: string; responseCode?: number; command?: string; originalCode?: string; timeoutType?: string };

type TransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  requireTLS: boolean;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
  disableFileAccess: boolean;
  disableUrlAccess: boolean;
}) => Pick<Transporter, "sendMail">;

function positiveInteger(value: string | undefined, fallback: number, maximum = 2147483647) {
  if (value === undefined) return fallback;
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= maximum ? number : null;
}

function booleanValue(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" ? true : normalized === "false" ? false : null;
}

export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig | null {
  const host = env.SMTP_HOST?.trim() ?? "";
  const user = env.SMTP_USER?.trim() ?? "";
  const pass = env.SMTP_PASS ?? "";
  const from = env.MAIL_FROM?.trim() ?? "";
  if (!host || !user || !pass.trim() || !from) return null;
  const port = positiveInteger(env.SMTP_PORT, 587, 65535);
  if (port === null) return null;
  const secure = booleanValue(env.SMTP_SECURE, port === 465);
  const requireTLS = booleanValue(env.SMTP_REQUIRE_TLS, !secure);
  const connectionTimeout = positiveInteger(env.SMTP_CONNECTION_TIMEOUT, 10000);
  const greetingTimeout = positiveInteger(env.SMTP_GREETING_TIMEOUT, 10000);
  const socketTimeout = positiveInteger(env.SMTP_SOCKET_TIMEOUT, 15000);
  if (secure === null || requireTLS === null || connectionTimeout === null
    || greetingTimeout === null || socketTimeout === null || (port === 465 && !secure)) return null;
  return { host, port, secure, user, pass, from, requireTLS, connectionTimeout, greetingTimeout, socketTimeout };
}

export function mailFailure(error: unknown): MailDeliveryResult {
  const detail = error as { code?: unknown; responseCode?: unknown; command?: unknown; originalCode?: unknown; timeoutType?: unknown } | null;
  const result: MailDeliveryResult = {
    status: "failed",
    code: typeof detail?.code === "string" && /^[A-Z0-9_]+$/.test(detail.code) ? detail.code : "SMTP_SEND_FAILED",
    ...(typeof detail?.responseCode === "number" ? { responseCode: detail.responseCode } : {}),
    ...(typeof detail?.command === "string" && /^[A-Z0-9 _-]+$/.test(detail.command) ? { command: detail.command } : {}),
    ...(typeof detail?.originalCode === "string" && /^[A-Z0-9_]+$/.test(detail.originalCode) ? { originalCode: detail.originalCode } : {}),
    ...(typeof detail?.timeoutType === "string" && /^[A-Z_]+$/.test(detail.timeoutType) ? { timeoutType: detail.timeoutType } : {}),
  };
  // SMTP error messages/responses may contain addresses or credentials. Log only
  // stable diagnostic fields, never the raw error or authentication options.
  console.error("No se pudo enviar el correo.", result);
  return result;
}

export function smtpTransportOptions(config: MailConfig) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    requireTLS: config.requireTLS,
    connectionTimeout: config.connectionTimeout,
    greetingTimeout: config.greetingTimeout,
    socketTimeout: config.socketTimeout,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export async function callMailRelay(
  operation: "verify" | "send", config: MailConfig, env: NodeJS.ProcessEnv,
  message?: MailMessage, fetcher: typeof fetch = (input, init) => fetch(input, init),
): Promise<MailDeliveryResult | { verified: true }> {
  try {
    const url = new URL(env.MAIL_RELAY_URL ?? "");
    const token = env.MAIL_RELAY_TOKEN ?? "";
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
      || url.port || !url.hostname.endsWith(".supabase.co") || url.pathname !== "/functions/v1/mail-relay"
      || (env.SUPABASE_URL && url.origin !== new URL(env.SUPABASE_URL).origin) || token.length < 32) {
      return mailFailure({ code: "MAIL_RELAY_CONFIG_INVALID" });
    }
    const response = await fetcher(url.href, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(30000),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ operation, smtp: { user: config.user, pass: config.pass }, ...(message ? { message } : {}) }),
    });
    const body = await response.json().catch(() => null) as {
      verified?: boolean; result?: MailDeliveryResult;
    } | null;
    if (response.ok && operation === "verify" && body?.verified === true) return { verified: true };
    if (response.ok && operation === "send" && body?.result?.status === "sent"
      && typeof body.result.messageId === "string" && body.result.messageId) return body.result;
    if (body?.result?.status === "failed") return mailFailure(body.result);
    return mailFailure({ code: response.status === 401 ? "MAIL_RELAY_UNAUTHORIZED" : "MAIL_RELAY_FAILED" });
  } catch (error) {
    const result = mailFailure(error);
    if (operation === "verify" && env.MAIL_DIAGNOSTIC_TOKEN
      && Date.parse(env.MAIL_DIAGNOSTIC_EXPIRES_AT ?? "") > Date.now()) {
      let detail = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown relay failure";
      for (const value of [config.pass, config.user, env.MAIL_RELAY_TOKEN, env.MAIL_DIAGNOSTIC_TOKEN]) {
        if (value) detail = detail.split(value).join("[redacted]");
      }
      return Object.assign(result, { diagnostic: detail.slice(0, 500) });
    }
    return result;
  }
}

export async function deliverMail(
  message: MailMessage,
  options: { env?: NodeJS.ProcessEnv; createTransport?: TransportFactory; fetch?: typeof fetch } = {},
): Promise<MailDeliveryResult> {
  const env = options.env ?? process.env;
  const config = readMailConfig(env);
  if (!config) {
    return mailFailure({ code: "SMTP_CONFIG_INVALID" });
  }
  if (env.MAIL_RELAY_URL || env.MAIL_RELAY_TOKEN) {
    const result = await callMailRelay("send", config, env, message, options.fetch);
    return "verified" in result ? mailFailure({ code: "MAIL_RELAY_FAILED" }) : result;
  }
  try {
    const createTransport = options.createTransport ?? (await import("nodemailer")).createTransport;
    const transport = createTransport(smtpTransportOptions(config));
    const info = await transport.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    // A resolved Promise alone is not proof that a recipient was accepted.
    if (!info || !Array.isArray(info.accepted) || info.accepted.length === 0
      || (Array.isArray(info.rejected) && info.rejected.length > 0)) {
      return mailFailure({ code: "SMTP_RECIPIENT_REJECTED", command: "RCPT TO" });
    }
    const result: MailDeliveryResult = { status: "sent", messageId: info.messageId };
    console.info("Correo aceptado por SMTP.", result);
    return result;
  } catch (error) {
    return mailFailure(error);
  }
}
