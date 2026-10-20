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
};

type TransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}) => Pick<Transporter, "sendMail">;

export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig | null {
  const host = env.SMTP_HOST?.trim() ?? "";
  const user = env.SMTP_USER?.trim() ?? "";
  const pass = env.SMTP_PASS ?? "";
  const from = env.MAIL_FROM?.trim() ?? "";
  if (!host || !user || !pass || !from) return null;
  const port = Number(env.SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port <= 0) return null;
  const secure = env.SMTP_SECURE === "true" || port === 465;
  return { host, port, secure, user, pass, from };
}

export async function deliverMail(
  message: MailMessage,
  options: { env?: NodeJS.ProcessEnv; createTransport?: TransportFactory } = {},
): Promise<void> {
  const config = readMailConfig(options.env ?? process.env);
  if (!config) {
    console.error("SMTP no está configurado. No se envió el correo.");
    return;
  }
  try {
    const createTransport = options.createTransport ?? (await import("nodemailer")).createTransport;
    const transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    await transport.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  } catch (error) {
    console.error("No se pudo enviar el correo.", error);
  }
}
