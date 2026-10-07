"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordForm() {
  const { t } = usePreferences();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthShell eyebrow={t("Ayuda para entrar")} title={t("Recuperar contraseña")}>
      {sent ? (
        <div className="space-y-5 text-sm">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">{t("Si el correo está registrado, recibirás instrucciones para crear una nueva contraseña. ")}</p>
          <Link href="/login" className="block text-center font-medium text-primary underline-offset-4 hover:underline">{t("Volver a iniciar sesión ")}</Link>
        </div>
      ) : (
        <>
          <p className="mb-6 -mt-6 text-sm text-muted-foreground">{t("Escribe el correo de tu cuenta y te ayudaremos a recuperar el acceso. ")}</p>
          <form className="flex flex-col gap-5" onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setSubmitting(true);
            const form = new FormData(event.currentTarget);
            const email = String(form.get("email") ?? "").trim().toLowerCase();
            try {
              const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                credentials: "same-origin",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email }),
              });
              const payload = await response.json() as { error?: string };
              if (!response.ok) throw new Error(payload.error ?? "No se pudo enviar el correo.");
              setSent(true);
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : "No se pudo enviar el correo.");
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
            <Button type="submit" className="mt-1 w-full" disabled={submitting}>{submitting ? "Enviando..." : t("Enviar instrucciones")}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">{t("Volver a iniciar sesión")}</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
