"use client";

import type { TransportReservation } from "@/modules/transport/reservations/models/Reservation";
import { routeTitle } from "@/modules/transport/routes/models/Route";

type TransportConfirmViewProps = {
  reservation: TransportReservation;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
};

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TransportConfirmView({
  reservation,
  headingRef,
  onBack,
}: TransportConfirmViewProps) {
  const title = routeTitle(reservation);

  return (
    <div className="page-shell">
      <button className="back-link" type="button" onClick={onBack}>
        ← Volver a explorar
      </button>
      <div className="form-header">
        <p className="eyebrow">Reserva registrada</p>
        <h1 className="form-title" ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <p>
          Tu traslado quedó confirmado. El proveedor te contactará con el punto
          de encuentro.
        </p>
      </div>
      <aside className="summary-card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="notice notice-success">
          <strong>
            Reserva registrada: {title} · {reservation.people}{" "}
            {reservation.people === 1 ? "persona" : "personas"} · $
            {reservation.totalUsd}
          </strong>
          <span>Estado: {reservation.status}</span>
        </div>
        <div>
          <span>Fecha</span>
          <strong>{formatDate(reservation.date)}</strong>
        </div>
        <div>
          <span>Personas</span>
          <strong>{reservation.people}</strong>
        </div>
        <div>
          <span>Origen</span>
          <strong>{reservation.origin}</strong>
        </div>
        <div>
          <span>Destino</span>
          <strong>{reservation.destination}</strong>
        </div>
        <div className="total-row">
          <span>Total</span>
          <strong>${reservation.totalUsd}</strong>
        </div>
        <button
          className="button button-primary button-full"
          type="button"
          onClick={onBack}
        >
          Seguir explorando
        </button>
        <p className="fine-print">
          Demostración académica: no se solicitarán datos bancarios ni se
          realizará un cobro.
        </p>
      </aside>
    </div>
  );
}
