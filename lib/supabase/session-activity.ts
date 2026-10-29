// Keep checking expiry, revocation and profile permissions on every request;
// only the activity write is coalesced to at most one per minute normally.
export function shouldTouchSession(lastSeen: string | undefined, now = Date.now()) {
  const seen = Date.parse(lastSeen ?? '');
  return !Number.isFinite(seen) || now - seen >= 60_000;
}
