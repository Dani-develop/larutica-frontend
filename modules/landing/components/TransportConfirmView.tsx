"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import type { TransportReservation } from "@/modules/transport/reservations/models/Reservation";
import { routeTitle } from "@/modules/transport/routes/models/Route";

type TransportConfirmViewProps = {
  reservation: TransportReservation;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
};

function formatDate(isoDate: string, language: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(language === "en" ? "en-US" : "es-CR", {
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
  const { t, money, language } = usePreferences();
  const title = routeTitle(reservation);

  return (
    <div className="page-shell">
      <button className="back-link" type="button" onClick={onBack}>{t("← Volver a explorar ")}</button>
      <div className="form-header">
        <p className="eyebrow">{t("Reserva registrada")}</p>
        <h1 className="form-title lr-page-title" ref={headingRef} tabIndex={-1}>
          {t(title)}
        </h1>
        <p>{t("Tu traslado quedó confirmado. El proveedor te contactará con el punto de encuentro. ")}</p>
      </div>
      <aside className="summary-card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="notice notice-success">
          <strong>{t("Reserva registrada: ")}{t(title)} · {reservation.people}{" "}
            {reservation.people === 1 ? t("persona") : t("personas")} ·
            {money(reservation.totalUsd)}
          </strong>
          <span>{t("Estado: ")}{reservation.status}</span>
        </div>
        <div>
          <span>{t("Fecha")}</span>
          <strong>{formatDate(reservation.date,language)}</strong>
        </div>
        <div>
          <span>{t("Personas")}</span>
          <strong>{reservation.people}</strong>
        </div>
        <div>
          <span>{t("Origen")}</span>
          <strong>{reservation.origin}</strong>
        </div>
        <div>
          <span>{t("Destino")}</span>
          <strong>{reservation.destination}</strong>
        </div>
        <div className="total-row">
          <span>{t("Total")}</span>
          <strong>{money(reservation.totalUsd)}</strong>
        </div>
        <button
          className="button button-primary button-full"
          type="button"
          onClick={onBack}
        >{t("Seguir explorando ")}</button>
        <p className="fine-print">{t("Demostración académica: no se solicitarán datos bancarios ni se realizará un cobro. ")}</p>
      </aside>
    </div>
  );
}
