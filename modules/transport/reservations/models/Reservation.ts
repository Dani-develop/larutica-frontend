export type ReservationStatus = "Confirmada";

export type TransportReservation = {
  id: string;
  routeId: string;
  origin: string;
  destination: string;
  date: string;
  people: number;
  totalUsd: number;
  status: ReservationStatus;
  createdAt: string;
};

export type ReservationInput = Omit<TransportReservation, "id" | "createdAt">;
