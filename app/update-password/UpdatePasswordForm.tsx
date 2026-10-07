"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function UpdatePasswordForm() {
  const { t } = usePreferences();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthShell eyebrow={t("Seguridad")} title={t("Nueva contraseña")}>
      {saved ? (
        <div className="space-y-5 text-sm"><p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">{t("Contraseña actualizada correctamente.")}</p><Button asChild className="w-full"><Link href="/dashboard">{t("Volver al dashboard")}</Link></Button></div>
      ) : (
        <form className="space-y-5" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const password = String(form.get("password") ?? "");
          const confirmation = String(form.get("confirmation") ?? "");
          if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
          if (password !== confirmation) return setError("Las contraseñas no coinciden.");
          setSubmitting(true);
          setError(null);
          const response = await fetch("/api/auth/password", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const payload = await response.json() as { error?: string };
          setSubmitting(false);
          if (!response.ok) return setError(payload.error ?? "No se pudo actualizar la contraseña.");
          setSaved(true);
        }}>
          <FieldGroup><Field><FieldLabel htmlFor="password">{t("Nueva contraseña")}</FieldLabel><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></Field></FieldGroup>
          <FieldGroup><Field><FieldLabel htmlFor="confirmation">{t("Confirmar contraseña")}</FieldLabel><Input id="confirmation" name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></Field></FieldGroup>
          {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Guardando..." : t("Guardar contraseña")}</Button>
        </form>
      )}
    </AuthShell>
  );
}
