"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listProfiles } from "@/modules/crm/users/services/usersService";
import { getAdminAgencies } from "@/modules/agency/services/admin/admin-agency.service";
import { getAdminPublication, getAdminPublications, type AdminPublication } from "@/modules/publications/services/admin/admin-publication.service";
import { listReservations, type Reservation } from "@/modules/transport/reservations/services/reservation.service";

type Resource<T> = { data: T | null; loading: boolean; error: boolean };
const initial = <T,>(): Resource<T> => ({ data: null, loading: true, error: false });
export type DashboardPeriod = "month" | "previous";
type UpcomingDeparture = {
  id: string; publicationId: string; title: string | null; image: string | null;
  agency: string | null; startAt: string; capacity: number; occupied: number;
};

// Existing list responses have no total/pagination contract. This costs N detail
// requests per load/refresh (N unique returned publications), not just five.
// Bound concurrency; do not filter publication states or omit zero-booking trips.
async function loadPublicationDetails(publications: AdminPublication[], isActive = () => true) {
  const ids = [...new Set(publications.map(publication => publication.id))];
  const details: AdminPublication[] = [];
  let cursor = 0;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (isActive() && cursor < ids.length) {
      const id = ids[cursor++];
      try { details.push(await getAdminPublication(id)); }
      catch { failed = true; }
    }
  }));
  // Never present partial results as the globally earliest five departures.
  if (failed) throw new Error("Could not load departures");
  return details;
}

// Calendar keys must not depend on the browser timezone.
export function reservationDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

export function useAdminDashboard() {
  const [users, setUsers] = useState(initial<Awaited<ReturnType<typeof listProfiles>>>);
  const [agencies, setAgencies] = useState(initial<Awaited<ReturnType<typeof getAdminAgencies>>>);
  const [publications, setPublications] = useState(initial<Awaited<ReturnType<typeof getAdminPublications>>>);
  const [reservations, setReservations] = useState(initial<Reservation[]>);
  const [departurePublications, setDeparturePublications] = useState(initial<AdminPublication[]>);
  const [snapshotTime, setSnapshotTime] = useState(0);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [request, setRequest] = useState(0);
  const [today, setToday] = useState("");
  const reload = useCallback(() => setRequest(value => value + 1), []);

  useEffect(() => {
    let active = true;
    async function load<T>(fetcher: () => Promise<T>, update: (value: Resource<T>) => void) {
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
      setToday(reservationDay(new Date().toISOString()));
      setSnapshotTime(Date.now());
      setDeparturePublications(initial<AdminPublication[]>());
      void Promise.all([
        load(listProfiles, setUsers), load(getAdminAgencies, setAgencies),
        load(getAdminPublications, setPublications).then(data => {
          if (!active) return;
          if (!data) {
            setDeparturePublications({ data: null, loading: false, error: true });
            return;
          }
          return load(async () => {
            const details = await loadPublicationDetails(data, () => active);
            if (active) setSnapshotTime(Date.now());
            return details;
          }, setDeparturePublications);
        }),
        load(listReservations, setReservations),
      ]);
    });
    return () => { active = false; };
  }, [request]);

  const summary = useMemo(() => {
    const currentMonth = today.slice(0, 7);
    const [year, month] = currentMonth.split("-").map(Number);
    const selected = new Date(Date.UTC(year, month - (period === "previous" ? 2 : 1), 1));
    const selectedMonth = Number.isNaN(selected.getTime()) ? "" : selected.toISOString().slice(0, 7);
    const days = selectedMonth ? new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 0)).getUTCDate() : 0;
    const counts = new Map<string, number>();
    let monthReservations = 0;
    for (const reservation of reservations.data ?? []) {
      const day = reservationDay(reservation.createdAt);
      if (day && day.startsWith(currentMonth)) monthReservations++;
      if (day && day.startsWith(selectedMonth)) counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return {
      monthReservations,
      bars: Array.from({ length: days }, (_, index) => {
        const day = selectedMonth + "-" + String(index + 1).padStart(2, "0");
        return { day, count: counts.get(day) ?? 0 };
      }),
      recent: [...(reservations.data ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
      pendingAgencies: agencies.data?.filter(item => item.status === "PENDING").length,
      pendingPublications: publications.data?.filter(item => item.status === "PENDING").length,
      // Temporary dashboard definition: active means APPROVED.
      activePublications: publications.data?.filter(item => item.status === "APPROVED").length,
    };
  }, [today, period, reservations.data, agencies.data, publications.data]);

  const upcomingDepartures = useMemo((): Resource<UpcomingDeparture[]> => {
    if (departurePublications.error || reservations.error) return { data: null, loading: false, error: true };
    if (departurePublications.loading || reservations.loading) return initial<UpcomingDeparture[]>();
    const occupied = new Map<string, number>();
    // Match usedDepartureSeats exactly: all statuses except CANCELLED occupy seats.
    for (const reservation of reservations.data ?? []) {
      if (reservation.status !== "CANCELLED") {
        occupied.set(reservation.departureId, (occupied.get(reservation.departureId) ?? 0) + Number(reservation.numberOfPeople));
      }
    }
    const data = (departurePublications.data ?? []).flatMap(publication => publication.departures
      .filter(departure => departure.status === "ACTIVE" && Date.parse(departure.startAt) > snapshotTime)
      .map(departure => ({
        id: departure.id, publicationId: publication.id, title: publication.title,
        image: publication.mainImageUrl,
        agency: publication.agency?.commercialName || publication.agency?.agencyName || null,
        startAt: departure.startAt, capacity: departure.capacity,
        occupied: occupied.get(departure.id) ?? 0,
      })))
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id)).slice(0, 5);
    return { data, loading: false, error: false };
  }, [departurePublications, reservations, snapshotTime]);

  return { users, agencies, publications, reservations, upcomingDepartures, period, setPeriod, reload, ...summary };
}
