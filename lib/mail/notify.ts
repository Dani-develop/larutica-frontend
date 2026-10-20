import {
  departureCancellationMessage,
  publicationDecisionMessage,
  reservationConfirmationMessages,
  type ReservationMailFacts,
} from "./messages.ts";
import { deliverMail, type MailMessage } from "./send.ts";

export type MailSender = (message: MailMessage) => Promise<void>;

async function deliverEach(messages: MailMessage[], send: MailSender) {
  for (const message of messages) {
    try {
      await send(message);
    } catch (error) {
      console.error("No se pudo enviar el correo.", error);
    }
  }
}

export async function notifyReservationCreated(
  facts: ReservationMailFacts,
  inserted: boolean,
  send: MailSender = deliverMail,
) {
  await deliverEach(reservationConfirmationMessages(facts, inserted), send);
}

export type CancelledReservationMail = ReservationMailFacts & { passengerEmail?: string | null };

export async function notifyDepartureCancellations(
  rows: CancelledReservationMail[],
  send: MailSender = deliverMail,
) {
  const messages = rows.flatMap((row) => {
    const to = row.passengerEmail?.trim();
    if (!to) return [];
    return [departureCancellationMessage({ ...row, passengerEmail: to })];
  });
  await deliverEach(messages, send);
  return rows;
}

export async function notifyPublicationDecision(
  input: {
    previousStatus: string;
    status: "APPROVED" | "REJECTED";
    title: string;
    agencyEmail?: string | null;
  },
  send: MailSender = deliverMail,
) {
  const message = publicationDecisionMessage(input);
  if (message) await send(message);
}
