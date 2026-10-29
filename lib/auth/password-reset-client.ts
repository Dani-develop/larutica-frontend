const STORAGE_KEY = "larutica.password-reset";

export type PasswordResetDraft = {
  challengeId: string;
  email: string;
  resetGrant?: string;
};

export function readPasswordResetDraft(): PasswordResetDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PasswordResetDraft> | null;
    if (!parsed || typeof parsed.challengeId !== "string" || typeof parsed.email !== "string") return null;
    if (!parsed.challengeId || !parsed.email) return null;
    return {
      challengeId: parsed.challengeId,
      email: parsed.email,
      ...(typeof parsed.resetGrant === "string" && parsed.resetGrant ? { resetGrant: parsed.resetGrant } : {}),
    };
  } catch {
    return null;
  }
}

export function writePasswordResetDraft(draft: PasswordResetDraft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    challengeId: draft.challengeId,
    email: draft.email,
    ...(draft.resetGrant ? { resetGrant: draft.resetGrant } : {}),
  }));
}

export function clearPasswordResetDraft() {
  sessionStorage.removeItem(STORAGE_KEY);
}
