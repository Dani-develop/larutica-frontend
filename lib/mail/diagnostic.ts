import { timingSafeEqual } from "node:crypto";
import { apiErrorResponse, assertSameOrigin } from "../api/errors.ts";
import { callMailRelay, deliverMail, mailFailure, readMailConfig, smtpTransportOptions, type MailDeliveryResult } from "./send.ts";
import { notifyDepartureCancellations, notifyPublicationDecision, notifyReservationCreated } from "./notify.ts";

/** Disabled unless the Site owner configures an expiring diagnostic capability.
 * It can only send test templates to the one configured test recipient. It does
 * not read user data, create business records or return runtime secrets.
 */
export async function runMailDiagnostic(request: Request, env: NodeJS.ProcessEnv = process.env): Promise<Response> {
  const token = env.MAIL_DIAGNOSTIC_TOKEN ?? "";
  const expiresAt = Date.parse(env.MAIL_DIAGNOSTIC_EXPIRES_AT ?? "");
  const to = env.MAIL_DIAGNOSTIC_TO?.trim() ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;
  if (token.length < 32 || !Number.isFinite(expiresAt) || expiresAt <= Date.now()
    || expiresAt - Date.now() > 3600000 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)
    || Buffer.byteLength(authorization) !== Buffer.byteLength(expected)
    || !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) {
    return Response.json({ error: "No encontrado." }, { status: 404, headers: { "cache-control": "no-store" } });
  }
  try {
    assertSameOrigin(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object" || Array.isArray(body)
      || Object.keys(body).some(key => key !== "send") || (body.send !== undefined && typeof body.send !== "boolean")) {
      return Response.json({ error: "Solicitud de diagnóstico no válida." }, { status: 400 });
    }
    const probes: Array<{ port: number; secure: boolean; verified: boolean; transport?: string; error?: MailDeliveryResult }> = [];
    let activeEnv = env;
    async function verify(values: NodeJS.ProcessEnv) {
      const config = readMailConfig(values);
      if (!config) {
        probes.push({ port: 0, secure: false, verified: false, error: mailFailure({ code: "SMTP_CONFIG_INVALID" }) });
        return false;
      }
      if (values.MAIL_RELAY_URL || values.MAIL_RELAY_TOKEN) {
        const result = await callMailRelay("verify", config, values);
        const verified = "verified" in result && result.verified;
        probes.push({ port: 465, secure: true, transport: "https-relay", verified,
          ...("status" in result ? { error: result } : {}) });
        return verified;
      }
      const { createTransport } = await import("nodemailer");
      const transport = createTransport(smtpTransportOptions(config));
      try {
        await transport.verify();
        probes.push({ port: config.port, secure: config.secure, verified: true });
        return true;
      } catch (error) {
        probes.push({ port: config.port, secure: config.secure, verified: false, error: mailFailure(error) });
        return false;
      } finally { transport.close(); }
    }
    let verified = await verify(activeEnv);
    if (!verified && !env.MAIL_RELAY_URL && !env.MAIL_RELAY_TOKEN && env.SMTP_HOST?.trim() === "smtp.gmail.com") {
      activeEnv = { ...env, SMTP_PORT: env.SMTP_PORT?.trim() === "465" ? "587" : "465",
        SMTP_SECURE: env.SMTP_PORT?.trim() === "465" ? "false" : "true" };
      verified = await verify(activeEnv);
    }
    const messages: Array<MailDeliveryResult & { flow: string }> = [];
    if (verified && body.send) {
      const facts = { id: "00000001-0000-4000-8000-000000000000", publicationTitle: "[PRUEBA TÉCNICA] LaRutica Sites — no es una reserva real",
        departureStartAt: "2099-06-15T15:00:00.000Z", numberOfPeople: 2, total: 80,
        passengerName: "Prueba técnica", passengerEmail: to, agencyEmail: to };
      const labels = ["reserva_viajero", "reserva_agencia", "cancelacion_salida", "publicacion_aprobada", "publicacion_rechazada"];
      const send = async (message: { to: string; subject: string; text: string }) => {
        const index = messages.length;
        const result = await deliverMail({ ...message, to, subject: `[PRUEBA Sites ${index + 1}/5] ${message.subject}` }, { env: activeEnv });
        messages.push({ flow: labels[index], ...result });
        return result;
      };
      await notifyReservationCreated(facts, true, send);
      await notifyDepartureCancellations([facts], send);
      await notifyPublicationDecision({ previousStatus: "PENDING", status: "APPROVED", title: facts.publicationTitle, agencyEmail: to }, send);
      await notifyPublicationDecision({ previousStatus: "PENDING", status: "REJECTED", title: facts.publicationTitle, agencyEmail: to }, send);
    }
    const accepted = messages.filter(message => message.status === "sent").length;
    return Response.json({ data: { verified, probes, accepted, messages } }, {
      status: verified && (!body.send || accepted === 5) ? 200 : 502,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) { return apiErrorResponse(error); }
}
