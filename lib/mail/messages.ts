import { dateLabel, money } from "../../modules/booking/types.ts";

import type { MailMessage } from "./send";

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

function reservationBody(facts: ReservationMailFacts, extra: string[]) {
  return [
    ...extra,
    `Experiencia: ${facts.publicationTitle}`,
    `Salida: ${dateLabel(facts.departureStartAt)}`,
    `Personas: ${facts.numberOfPeople}`,
    `Total: ${money(facts.total)}`,
    `Número de reserva: ${reservationCode(facts.id)}`,
  ].join("\n");
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
    messages.push({
      to: traveler,
      subject: "Reserva realizada",
      text: reservationBody(facts, shared),
    });
  }
  const agency = facts.agencyEmail?.trim();
  if (agency) {
    messages.push({
      to: agency,
      subject: "Reserva realizada",
      text: reservationBody(facts, [
        ...shared,
        `A nombre de: ${facts.passengerName?.trim() || "Viajero"}`,
      ]),
    });
  }
  return messages;
}

export function departureCancellationMessage(facts: ReservationMailFacts & { passengerEmail: string }): MailMessage {
  return {
    to: facts.passengerEmail,
    subject: "Salida cancelada",
    text: reservationBody(facts, [
      "El organizador canceló esta salida.",
      "Tu reserva quedó cancelada.",
    ]),
  };
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
  return {
    to,
    subject: accepted ? "Publicación aceptada" : "Publicación negada",
    text: [
      `Tu publicación «${input.title}» fue ${result}.`,
      accepted
        ? "La administración aceptó esta gira o viaje."
        : "La administración negó esta gira o viaje.",
    ].join("\n"),
  };
}
