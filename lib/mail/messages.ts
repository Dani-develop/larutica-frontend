import { dateLabel, money } from "../../modules/booking/types.ts";

import type { MailMessage } from "./send";
import { renderBrandedMail } from "./template.ts";

export type ReservationMailFacts = {
  id: string;
  publicationTitle: string;
  departureStartAt: string;
  numberOfPeople: number;
  total: number;
  passengerName?: string | null;
  passengerEmail?: string | null;
  agencyEmail?: string | null;
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
  ];
}

function mailMessage(
  to: string,
  subject: string,
  paragraphs: string[],
  facts: Array<[string, string]> = [],
): MailMessage {
  return {
    to,
    subject,
    text: [...paragraphs, ...facts.map(([label, value]) => `${label}: ${value}`)].join("\n"),
    html: renderBrandedMail({
      heading: paragraphs[0] || subject,
      paragraphs: paragraphs.slice(1),
      facts,
    }),
  };
}

export function reservationConfirmationMessages(facts: ReservationMailFacts, inserted: boolean): MailMessage[] {
  if (!inserted) return [];
  const shared = [
    "Reserva realizada",
    "Reservada",
    "No se realizó ningún cobro.",
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
