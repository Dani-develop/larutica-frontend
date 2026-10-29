"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { clearPasswordResetDraft, readPasswordResetDraft } from "@/lib/auth/password-reset-client";
import { RESET_PASSWORD_LENGTH, RESET_PASSWORD_MISMATCH } from "@/lib/auth/password-reset";

export default function NewPasswordForm() {
  const { t } = usePreferences();
  const router = useRouter();
  const [resetGrant, setResetGrant] = useState<string | null>(null);
  const [phase, setPhase] = useState<"pending" | "ready" | "missing">("pending");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const draft = readPasswordResetDraft();
    if (!draft?.resetGrant) {
      setPhase("missing");
      router.replace("/forgot-password");
      return;
    }
    setResetGrant(draft.resetGrant);
    setPhase("ready");
  }, [router]);

  return (
    <AuthShell eyebrow={t("Ayuda para entrar")} title={t("Nueva contraseña")}>
      {phase === "ready" && resetGrant ? (
        <>
          <p className="mb-6 -mt-6 text-sm text-muted-foreground">{t("Elige una contraseña de 8 a 128 caracteres y confírmala.")}</p>
          <form className="flex flex-col gap-5" noValidate onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const password = String(form.get("password") ?? "");
            const confirmation = String(form.get("confirmation") ?? "");
            if (password.length < 8 || password.length > 128) {
              setError(RESET_PASSWORD_LENGTH);
              return;
            }
            if (password !== confirmation) {
              setError(RESET_PASSWORD_MISMATCH);
              return;
            }
            setError(null);
            setSubmitting(true);
            try {
              const response = await fetch("/api/auth/forgot-password/complete", {
                method: "POST",
                credentials: "same-origin",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ resetGrant, password, confirmation }),
              });
              const payload = await response.json() as { error?: string };
              if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar la contraseña.");
              clearPasswordResetDraft();
              window.location.assign("/dashboard");
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : "No se pudo guardar la contraseña.");
              setSubmitting(false);
            }
          }}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">{t("Nueva contraseña")}</FieldLabel>
                <Input id="password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="confirmation">{t("Confirmar contraseña")}</FieldLabel>
                <Input id="confirmation" name="confirmation" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
              </Field>
            </FieldGroup>
            {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? t("Guardando…") : t("Guardar contraseña")}</Button>
          </form>
        </>
      ) : (
        <p className="text-base text-muted-foreground">{t(phase === "missing" ? "Redirigiendo..." : "Validando...")}</p>
      )}
    </AuthShell>
  );
}
