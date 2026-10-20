import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { money } from "../modules/booking/types.ts";
import { deliverMail } from "../lib/mail/send.ts";
import {
  departureCancellationMessage,
  publicationDecisionMessage,
  reservationCode,
  reservationConfirmationMessages,
} from "../lib/mail/messages.ts";
import {
  notifyDepartureCancellations,
  notifyPublicationDecision,
  notifyReservationCreated,
} from "../lib/mail/notify.ts";
import {
  applyDepartureCancellation,
  reservationWasInserted,
} from "../lib/reservations/departure-cancel.ts";
import { reservationNotice } from "../modules/booking/reservationState.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const smtpEnv = {
  SMTP_HOST: "smtp.ejemplo.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "correo@ejemplo.com",
  SMTP_PASS: "secreto",
  MAIL_FROM: "LaRutica <correo@ejemplo.com>",
};
const facts = {
  id: "abcd1234-0000-4000-8000-000000000000",
  publicationTitle: "Volcán Arenal",
  departureStartAt: "2099-06-15T15:00:00.000Z",
  numberOfPeople: 2,
  total: 80,
  passengerName: "Ana Solís",
  passengerEmail: "ana@ejemplo.com",
  agencyEmail: "agencia@ejemplo.com",
};

test("el ejemplo documenta SMTP y el desarrollo versionado no guarda la clave", async () => {
  const example = await read(".env.example");
  const development = await read(".env.development");
  for (const name of ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"]) {
    assert.match(example, new RegExp(`^${name}=`, "m"));
  }
  assert.doesNotMatch(development, /SMTP_PASS/);
});

test("sin SMTP o con fallo de envío el correo no interrumpe la acción", async () => {
  await assert.doesNotReject(() => deliverMail({ to: "ana@ejemplo.com", subject: "Hola", text: "Cuerpo" }, { env: {} }));
  await assert.doesNotReject(() => deliverMail(
    { to: "ana@ejemplo.com", subject: "Hola", text: "Cuerpo" },
    {
      env: smtpEnv,
      createTransport: () => ({ sendMail: async () => { throw new Error("smtp caído"); } }),
    },
  ));
});

test("un envío configurado recibe host, puerto, remitente y destinatario", async () => {
  let seen;
  await deliverMail(
    { to: "ana@ejemplo.com", subject: "Reserva realizada", text: "Listo" },
    {
      env: smtpEnv,
      createTransport: (options) => ({
        sendMail: async (message) => { seen = { options, message }; },
      }),
    },
  );
  assert.equal(seen.options.host, "smtp.ejemplo.com");
  assert.equal(seen.options.port, 587);
  assert.equal(seen.message.from, "LaRutica <correo@ejemplo.com>");
  assert.equal(seen.message.to, "ana@ejemplo.com");
});

test("la confirmación repite la pantalla y la agencia ve quién reservó", () => {
  const messages = reservationConfirmationMessages(facts, true);
  assert.equal(messages.length, 2);
  for (const message of messages) {
    assert.match(message.text, /Volcán Arenal/);
    assert.match(message.text, /Personas: 2/);
    assert.match(message.text, new RegExp(money(80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(message.text, /No se realizó ningún cobro/);
    assert.match(message.text, new RegExp(reservationCode(facts.id)));
    assert.match(message.text, /15/);
  }
  assert.match(messages[1].text, /Ana Solís/);
  assert.equal(reservationConfirmationMessages({ ...facts, passengerEmail: "  " }, true)[0].to, "agencia@ejemplo.com");
  assert.equal(reservationConfirmationMessages(facts, false).length, 0);
});

test("la cancelación y la revisión dicen el resultado de esa salida o publicación", () => {
  const cancellation = departureCancellationMessage({ ...facts, passengerEmail: "ana@ejemplo.com" });
  assert.match(cancellation.text, /organizador canceló esta salida/);
  assert.match(cancellation.text, /reserva quedó cancelada/);
  assert.match(cancellation.text, /Volcán Arenal/);
  const accepted = publicationDecisionMessage({
    previousStatus: "PENDING", status: "APPROVED", title: "Volcán Arenal", agencyEmail: "agencia@ejemplo.com",
  });
  const rejected = publicationDecisionMessage({
    previousStatus: "PENDING", status: "REJECTED", title: "Volcán Arenal", agencyEmail: "agencia@ejemplo.com",
  });
  assert.match(accepted.text, /Volcán Arenal/);
  assert.match(accepted.text, /aceptada/);
  assert.match(rejected.text, /negada/);
  assert.equal(publicationDecisionMessage({
    previousStatus: "APPROVED", status: "REJECTED", title: "Volcán Arenal", agencyEmail: "agencia@ejemplo.com",
  }), null);
});

test("una reserva previa no avisa y una nueva avisa a quien reservó y a quien publicó", async () => {
  assert.equal(reservationWasInserted("PENDING"), false);
  assert.equal(reservationWasInserted("CONFIRMED"), false);
  assert.equal(reservationWasInserted(null), true);
  const sent = [];
  const send = async (message) => { sent.push(message.to); };
  await notifyReservationCreated(facts, false, send);
  assert.deepEqual(sent, []);
  await notifyReservationCreated({ ...facts, passengerEmail: null }, true, send);
  assert.deepEqual(sent, ["agencia@ejemplo.com"]);
  await notifyReservationCreated(facts, true, send);
  assert.deepEqual(sent, ["agencia@ejemplo.com", "ana@ejemplo.com", "agencia@ejemplo.com"]);
});

test("cancelar la salida avisa solo a las reservas que acaba de cerrar", async () => {
  const calls = [];
  const cancel = async () => {
    calls.push("cancel");
    return [{ ...facts, passengerEmail: "ana@ejemplo.com" }, { ...facts, id: "bbbb2222-0000-4000-8000-000000000000", passengerEmail: "luis@ejemplo.com" }];
  };
  assert.deepEqual(await applyDepartureCancellation("ACTIVE", "ACTIVE", cancel), []);
  assert.deepEqual(await applyDepartureCancellation("ACTIVE", undefined, cancel), []);
  assert.equal(calls.length, 0);
  const closed = await applyDepartureCancellation("ACTIVE", "CANCELLED", cancel);
  assert.equal(closed.length, 2);
  const sent = [];
  const send = async (message) => { sent.push(message.to); if (message.to === "luis@ejemplo.com") throw new Error("smtp"); };
  const saved = await notifyDepartureCancellations(closed, send);
  assert.deepEqual(saved, closed);
  assert.deepEqual(sent, ["ana@ejemplo.com", "luis@ejemplo.com"]);
  const departureRoute = await read("app/api/publications/[id]/departures/[departureId]/route.ts");
  const reservationRoute = await read("app/api/reservations/[id]/route.ts");
  assert.match(departureRoute, /applyDepartureCancellation/);
  assert.match(departureRoute, /cancelDepartureReservations/);
  assert.doesNotMatch(reservationRoute, /cancelDepartureReservations/);
  assert.doesNotMatch(reservationRoute, /cancel_departure_reservations/);
});

test("resolver una publicación avisa solo si estaba en revisión", async () => {
  const sent = [];
  const send = async (message) => { sent.push(message.text); };
  await notifyPublicationDecision({
    previousStatus: "APPROVED", status: "REJECTED", title: "Volcán Arenal", agencyEmail: "agencia@ejemplo.com",
  }, send);
  assert.deepEqual(sent, []);
  await notifyPublicationDecision({
    previousStatus: "PENDING", status: "APPROVED", title: "Volcán Arenal", agencyEmail: "agencia@ejemplo.com",
  }, send);
  await notifyPublicationDecision({
    previousStatus: "PENDING", status: "REJECTED", title: "Río Celeste", agencyEmail: "agencia@ejemplo.com",
  }, send);
  assert.match(sent[0], /Volcán Arenal/);
  assert.match(sent[0], /aceptada/);
  assert.match(sent[1], /Río Celeste/);
  assert.match(sent[1], /negada/);
});

test("Mis reservas informa que la reserva de esa fecha ya quedó cancelada", async () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const text = reservationNotice({
    status: "CANCELLED",
    departureStatus: "CANCELLED",
    departureStartAt: "2099-06-15T15:00:00.000Z",
  }, now);
  assert.doesNotMatch(text, /cancela tu reserva/);
  assert.match(text, /esta fecha y hora/);
  assert.match(text, /ya está cancelada/);
  assert.match(text, /historial/);
  const page = await read("modules/booking/Reservations.tsx");
  assert.doesNotMatch(page, /cancela tu reserva/);
  assert.match(page, /reservationNotice/);
});
