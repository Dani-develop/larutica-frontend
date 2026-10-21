"use client";
import { CurrencyNotice } from "@/components/preferences/PreferenceControls";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useState } from "react";
import type { TransportRoute } from "@/modules/transport/routes/models/Route";
import { routeTitle } from "@/modules/transport/routes/models/Route";

type TransportDetailViewProps = {
  route: TransportRoute;
  defaultDate: string;
  defaultPeople: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onConfirm: (input: { date: string; people: number; totalUsd: number }) => void;
};

export function TransportDetailView({
  route,
  defaultDate,
  defaultPeople,
  headingRef,
  onBack,
  onConfirm,
}: TransportDetailViewProps) {
  const { t, money } = usePreferences();
  const maxPeople = Math.min(route.seats, 8);
  const initialPeople = Math.min(Number(defaultPeople) || 1, maxPeople);
  const [people, setPeople] = useState(String(initialPeople));
  const [date, setDate] = useState(defaultDate);
  const total = route.priceUsd * Number(people);

  return (
    <div className="detail-page page-shell">
      <button className="back-link" onClick={onBack} type="button">{t("← Volver a resultados ")}</button>
      <div className="detail-grid">
        <div>
          <div className="detail-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={route.coverUrl} alt={routeTitle(route)} />
            <span className="badge">{t("Proveedor verificado")}</span>
          </div>
          <p className="eyebrow detail-eyebrow">{route.providerName}</p>
          <h1 className="detail-title lr-page-title" ref={headingRef} tabIndex={-1}>
            {routeTitle(route)}
          </h1>
          <p className="detail-intro">{route.excerpt}</p>
          <div className="facts" aria-label={t("Información del traslado")}>
            <div>
              <strong>{route.duration}</strong>
              <span>{t("Duración")}</span>
            </div>
            <div>
              <strong>{route.vehicleType}</strong>
              <span>{t("Vehículo")}</span>
            </div>
            <div>
              <strong>{route.seats}</strong>
              <span>{t("Asientos")}</span>
            </div>
            <div>
              <strong>{money(route.priceUsd)}</strong>
              <span>{t("Por persona")}</span>
            </div>
          </div>
          <h2 className="subheading">{t("Lo que incluye")}</h2>
          <ul className="check-list">
            {route.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2 className="subheading">{t("Punto de encuentro")}</h2>
          <p>{t("Recogida en ")}{route.origin}{t(". Recibirás el contacto del proveedor al confirmar. ")}</p>
        </div>
        <aside className="booking-card" aria-label={t("Reservar traslado")}>
          <p>
            <strong>{money(route.priceUsd)}</strong>{t(" por persona ")}</p>
          <p className="rating-line">
            {route.vehicleType} · {route.duration}
          </p>
          <label>
            <span>{t("Fecha")}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            <span>{t("Personas")}</span>
            <select
              value={people}
              onChange={(event) => setPeople(event.target.value)}
            >
              {Array.from({ length: maxPeople }, (_, index) => index + 1).map(
                (count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? "persona" : "personas"}
                  </option>
                ),
              )}
            </select>
          </label>
          <CurrencyNotice usd={total}/><div className="total-row">
            <span>{t("Total estimado")}</span>
            <strong>{money(total)}</strong>
          </div>
          <button
            className="button button-primary button-full"
            type="button"
            onClick={() =>
              onConfirm({
                date,
                people: Number(people),
                totalUsd: total,
              })
            }
          >{t("Confirmar reserva ")}</button>
          <p className="fine-print">{t("No se realiza ningún cobro en este prototipo. ")}</p>
        </aside>
      </div>
    </div>
  );
}
