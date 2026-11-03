import { dateLabel, money } from "../../modules/booking/types.ts";

import type { MailMessage } from "./send";
import { renderBrandedMail, type BrandedMailLink } from "./template.ts";

export type ReservationMailFacts = {
  id: string;
  publicationTitle: string;
  departureStartAt: string;
  numberOfPeople: number;
  total: number;
  passengerName?: string | null;
  passengerEmail?: string | null;
  agencyEmail?: string | null;
  paymentReference?: string;
  paidAt?: string;
};

export function reservationCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function reservationFacts(facts: ReservationMailFacts): Array<[string, string]> {
  return [
    ["Experiencia", facts.publicationTitle],
    ["Salida", dateLabel(facts.departureStartAt)],
    ["Personas", String(facts.numberOfPeople)],
    ["Total", money(facts.total)],
    ["Número de reserva", reservationCode(facts.id)],
    ...(facts.paymentReference ? [
      ["Estado del pago", "Pagado · OnvoPAY"],
      ["Referencia del pago", facts.paymentReference],
      ["Fecha del pago", dateLabel(facts.paidAt ?? new Date().toISOString())],
      ["Monto pagado", money(facts.total)],
    ] as Array<[string, string]> : []),
  ];
}

function mailMessage(
  to: string,
  subject: string,
  paragraphs: string[],
  facts: Array<[string, string]> = [],
  link?: BrandedMailLink,
): MailMessage {
  const lines = [...paragraphs, ...facts.map(([label, value]) => `${label}: ${value}`)];
  if (link) lines.push(link.href);
  return {
    to,
    subject,
    text: lines.join("\n"),
    html: renderBrandedMail({
      heading: paragraphs[0] || subject,
      paragraphs: paragraphs.slice(1),
      facts,
      link,
    }),
  };
}

export function reservationConfirmationMessages(facts: ReservationMailFacts, inserted: boolean): MailMessage[] {
  if (!inserted) return [];
  const shared = [
    "Reserva realizada",
    "Reservada",
    facts.paymentReference ? "Tu pago fue recibido y tu reserva está confirmada." : "No se realizó ningún cobro.",
  ];
  const messages: MailMessage[] = [];
  const traveler = facts.passengerEmail?.trim();
  if (traveler) {
    messages.push(mailMessage(traveler, "Reserva realizada", shared, reservationFacts(facts)));
  }
  const agency = facts.agencyEmail?.trim();
  if (agency) {
    messages.push(mailMessage(agency, "Reserva realizada", shared, [
      ["A nombre de", facts.passengerName?.trim() || "Viajero"],
      ...reservationFacts(facts),
    ]));
  }
  return messages;
}

export function departureCancellationMessage(facts: ReservationMailFacts & { passengerEmail: string }): MailMessage {
  return mailMessage(facts.passengerEmail, "Salida cancelada", [
    "El organizador canceló esta salida.",
    "Tu reserva quedó cancelada.",
  ], reservationFacts(facts));
}

export function departureDateChangeMessage(
  facts: ReservationMailFacts & { passengerEmail: string; newDepartureStartAt: string },
): MailMessage {
  return mailMessage(facts.passengerEmail, "Cambio de fecha del viaje", [
    "La agencia cambió la fecha de esta salida.",
    `Fecha nueva: ${dateLabel(facts.newDepartureStartAt)}`,
    "Tu reserva fue cancelada por el cambio de fecha.",
    "Si deseas asistir, debes realizar una nueva reserva para la fecha disponible.",
    "Si ya habías pagado, revisa el estado del reembolso en Mis reservas.",
  ], reservationFacts(facts));
}

export function publicationDeactivationMessage(
  facts: ReservationMailFacts & { passengerEmail: string },
): MailMessage {
  return mailMessage(facts.passengerEmail, "Viaje o gira desactivada", [
    "La agencia desactivó este viaje o gira.",
    "Tu reserva fue cancelada.",
    "Si ya habías pagado, revisa el estado del reembolso en Mis reservas.",
  ], reservationFacts(facts));
}

const PASSWORD_CHANGED_RECOVERY_URL = "https://larutica-cr.vercel.app/forgot-password";

export function passwordChangedMessage(to: string): MailMessage {
  return mailMessage(to, "Tu contraseña cambió", [
    "Tu contraseña cambió",
    "La contraseña de tu cuenta de LaRutica acaba de cambiar.",
    "¿No cambiaste la contraseña?, cambia la contraseña aquí",
  ], [], {
    href: PASSWORD_CHANGED_RECOVERY_URL,
    label: "aquí",
  });
}

export function passwordResetCodeMessage(to: string, code: string): MailMessage {
  return mailMessage(to, "Código para recuperar tu contraseña", [
    "Código para recuperar tu contraseña",
    `Usa este código: ${code}.`,
    "Este código vence en 15 minutos y solo puede usarse una vez.",
  ], [["Código", code]]);
}

export function publicationDecisionMessage(input: {
  previousStatus: string;
  status: "APPROVED" | "REJECTED";
  title: string;
  agencyEmail?: string | null;
}): MailMessage | null {
  const to = input.agencyEmail?.trim();
  if (input.previousStatus !== "PENDING" || !to) return null;
  const accepted = input.status === "APPROVED";
  const result = accepted ? "aceptada" : "negada";
  return mailMessage(to, accepted ? "Publicación aceptada" : "Publicación negada", [
    `Tu publicación «${input.title}» fue ${result}.`,
    accepted
      ? "La administración aceptó esta gira o viaje."
      : "La administración negó esta gira o viaje.",
  ]);
}
