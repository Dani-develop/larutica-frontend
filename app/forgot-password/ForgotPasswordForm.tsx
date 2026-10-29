"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { writePasswordResetDraft } from "@/lib/auth/password-reset-client";
import { normalizeResetEmail, RESET_EMAIL_INVALID } from "@/lib/auth/password-reset";

export default function ForgotPasswordForm() {
  const { t } = usePreferences();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthShell eyebrow={t("Ayuda para entrar")} title={t("Recuperar contraseña")}>
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">{t("Escribe el correo de tu cuenta y te ayudaremos a recuperar el acceso.")}</p>
      <form className="flex flex-col gap-5" noValidate onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const email = normalizeResetEmail(form.get("email"));
        if (!email) {
          setError(RESET_EMAIL_INVALID);
          return;
        }
        setSubmitting(true);
        try {
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const payload = await response.json() as { error?: string; data?: { challengeId?: string } };
          if (!response.ok || !payload.data?.challengeId) {
            throw new Error(payload.error ?? "No se pudo preparar la recuperación.");
          }
          writePasswordResetDraft({ challengeId: payload.data.challengeId, email });
          router.push("/forgot-password/code");
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "No se pudo preparar la recuperación.");
        } finally {
          setSubmitting(false);
        }
      }}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="recovery-email">{t("Correo electrónico")}</FieldLabel>
            <Input id="recovery-email" name="email" type="email" placeholder={t("correo@ejemplo.com")} autoComplete="email" required />
          </Field>
        </FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
        <Button type="submit" className="mt-1 w-full" disabled={submitting}>{submitting ? t("Enviando código…") : t("Continuar")}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">{t("Volver a iniciar sesión")}</Link>
      </p>
    </AuthShell>
  );
}
