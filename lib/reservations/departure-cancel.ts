export function shouldCancelOpenReservations(currentStatus: string, nextStatus: string | undefined) {
  return nextStatus === "CANCELLED" && currentStatus !== "CANCELLED";
}

export function reservationWasInserted(existingStatus: string | null) {
  return existingStatus === null;
}

export async function applyDepartureCancellation<T>(
  currentStatus: string,
  nextStatus: string | undefined,
  cancel: () => Promise<T[]>,
): Promise<T[]> {
  if (!shouldCancelOpenReservations(currentStatus, nextStatus)) return [];
  return cancel();
}
