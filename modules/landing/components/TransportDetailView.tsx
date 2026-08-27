"use client";

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
  const maxPeople = Math.min(route.seats, 8);
  const initialPeople = Math.min(Number(defaultPeople) || 1, maxPeople);
  const [people, setPeople] = useState(String(initialPeople));
  const [date, setDate] = useState(defaultDate);
  const total = route.priceUsd * Number(people);

  return (
    <div className="detail-page page-shell">
      <button className="back-link" onClick={onBack} type="button">
        ← Volver a resultados
      </button>
      <div className="detail-grid">
        <div>
          <div className="detail-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={route.coverUrl} alt={routeTitle(route)} />
            <span className="badge">Proveedor verificado</span>
          </div>
          <p className="eyebrow detail-eyebrow">{route.providerName}</p>
          <h1 className="detail-title" ref={headingRef} tabIndex={-1}>
            {routeTitle(route)}
          </h1>
          <p className="detail-intro">{route.excerpt}</p>
          <div className="facts" aria-label="Información del traslado">
            <div>
              <strong>{route.duration}</strong>
              <span>Duración</span>
            </div>
            <div>
              <strong>{route.vehicleType}</strong>
              <span>Vehículo</span>
            </div>
            <div>
              <strong>{route.seats}</strong>
              <span>Asientos</span>
            </div>
            <div>
              <strong>${route.priceUsd}</strong>
              <span>Por persona</span>
            </div>
          </div>
          <h2 className="subheading">Lo que incluye</h2>
          <ul className="check-list">
            {route.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2 className="subheading">Punto de encuentro</h2>
          <p>
            Recogida en {route.origin}. Recibirás el contacto del proveedor al
            confirmar.
          </p>
        </div>
        <aside className="booking-card" aria-label="Reservar traslado">
          <p>
            <strong>${route.priceUsd}</strong> por persona
          </p>
          <p className="rating-line">
            {route.vehicleType} · {route.duration}
          </p>
          <label>
            <span>Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            <span>Personas</span>
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
          <div className="total-row">
            <span>Total estimado</span>
            <strong>${total}</strong>
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
          >
            Confirmar reserva
          </button>
          <p className="fine-print">
            No se realiza ningún cobro en este prototipo.
          </p>
        </aside>
      </div>
    </div>
  );
}
