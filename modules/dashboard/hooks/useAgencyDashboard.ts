"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMyPublications, getMyDepartures } from "@/modules/publications/services/publication.service";
import type { Publication, PublicationDeparture } from "@/modules/publications/types/publication.types";
import { listReservations, type Reservation } from "@/modules/transport/reservations/services/reservation.service";
import { reservationDay, type DashboardPeriod } from "./useAdminDashboard";

type Resource<T> = { data: T | null; loading: boolean; error: boolean };
type AgencyDeparture = PublicationDeparture & { publication: Publication };
const initial = <T,>(): Resource<T> => ({ data: null, loading: true, error: false });

function combineDepartures(publications: Publication[], rows: PublicationDeparture[]): AgencyDeparture[] {
  const owned = new Map(publications.map(publication => [publication.id, publication]));
  return rows.flatMap(row => {
    const publication = owned.get(row.publicationId);
    return publication ? [{ ...row, publication }] : [];
  });
}

export function useAgencyDashboard() {
  const [publications, setPublications] = useState(initial<Publication[]>);
  const [reservations, setReservations] = useState(initial<Reservation[]>);
  const [departures, setDepartures] = useState(initial<AgencyDeparture[]>);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [snapshotTime, setSnapshotTime] = useState(0);
  const [request, setRequest] = useState(0);
  const reload = useCallback(() => setRequest(value => value + 1), []);

  useEffect(() => {
    let active = true;
    async function load<T>(fetcher: () => Promise<T>, update: (resource: Resource<T>) => void) {
      update(initial<T>());
      try {
        const data = await fetcher();
        if (active) update({ data, loading: false, error: false });
        return data;
      } catch {
        if (active) update({ data: null, loading: false, error: true });
      }
    }
    queueMicrotask(() => {
      if (!active) return;
      setSnapshotTime(Date.now());
      setDepartures(initial<AgencyDeparture[]>());
      // Default scope is owned-agency. `mine: true` would select passenger bookings.
      void load(() => listReservations(), setReservations);
      const publicationsRequest = load(getMyPublications, setPublications);
      void load(async () => {
        const [data, rows] = await Promise.all([publicationsRequest, getMyDepartures()]);
        if (!data) throw new Error("Could not load agency publications");
        if (active) setSnapshotTime(Date.now());
        return combineDepartures(data, rows);
      }, setDepartures);
    });
    return () => { active = false; };
  }, [request]);

  const summary = useMemo(() => {
    const currentMonth = snapshotTime ? reservationDay(new Date(snapshotTime).toISOString()).slice(0, 7) : "";
    const [year, month] = currentMonth.split("-").map(Number);
    const selected = new Date(Date.UTC(year, month - (period === "previous" ? 2 : 1), 1));
    const selectedMonth = Number.isNaN(selected.getTime()) ? "" : selected.toISOString().slice(0, 7);
    const days = selectedMonth ? new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 0)).getUTCDate() : 0;
    const counts = new Map<string, number>();
    const occupied = new Map<string, number>();
    let monthReservations = 0;
    let reservedTravelers = 0;
    for (const reservation of reservations.data ?? []) {
      const day = reservationDay(reservation.createdAt);
      if (day && selectedMonth && day.startsWith(selectedMonth)) {
        monthReservations++;
        counts.set(day, (counts.get(day) ?? 0) + 1);
        if (reservation.status !== "CANCELLED") reservedTravelers += Number(reservation.numberOfPeople);
      }
      // Match usedDepartureSeats: every status except CANCELLED occupies seats.
      // Occupancy is independent of the month in which the booking was created.
      if (reservation.status !== "CANCELLED") {
        occupied.set(reservation.departureId, (occupied.get(reservation.departureId) ?? 0) + Number(reservation.numberOfPeople));
      }
    }
    const upcoming = (departures.data ?? [])
      .filter(departure => departure.status === "ACTIVE" && Date.parse(departure.startAt) > snapshotTime)
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id));
    return {
      monthReservations,
      reservedTravelers,
      activePublications: publications.data?.filter(publication => publication.status === "APPROVED").length,
      pendingPublications: publications.data?.filter(publication => publication.status === "PENDING").length,
      rejectedPublications: publications.data?.filter(publication => publication.status === "REJECTED").length,
      upcomingCount: upcoming.length,
      upcoming: upcoming.slice(0, 5).map(departure => ({ ...departure, occupied: occupied.get(departure.id) ?? 0 })),
      recent: [...(reservations.data ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id)).slice(0, 5),
      bars: Array.from({ length: days }, (_, index) => {
        const day = `${selectedMonth}-${String(index + 1).padStart(2, "0")}`;
        return { day, count: counts.get(day) ?? 0 };
      }),
    };
  }, [snapshotTime, period, reservations.data, publications.data, departures.data]);

  return { publications, reservations, departures, period, setPeriod, reload, ...summary };
}
