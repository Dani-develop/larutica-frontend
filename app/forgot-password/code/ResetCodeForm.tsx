"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { readPasswordResetDraft, writePasswordResetDraft } from "@/lib/auth/password-reset-client";

export default function ResetCodeForm() {
  const { t } = usePreferences();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const draft = readPasswordResetDraft();
    if (!draft) router.replace("/forgot-password");
  }, [router]);

  async function resend() {
    const draft = readPasswordResetDraft();
    if (!draft) {
      router.replace("/forgot-password");
      return;
    }
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: draft.email }),
      });
      const payload = await response.json() as { error?: string; data?: { challengeId?: string } };
      if (!response.ok || !payload.data?.challengeId) {
        throw new Error(payload.error ?? "No se pudo preparar la recuperación.");
      }
      writePasswordResetDraft({ challengeId: payload.data.challengeId, email: draft.email });
      setCode("");
      setNotice("Puedes usar el código más reciente.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo preparar la recuperación.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell eyebrow={t("Ayuda para entrar")} title={t("Código de recuperación")}>
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">{t("Escribe el código de 5 dígitos. Caduca a los 15 minutos.")}</p>
      <form className="flex flex-col gap-5" onSubmit={async (event) => {
        event.preventDefault();
        const draft = readPasswordResetDraft();
        if (!draft) {
          router.replace("/forgot-password");
          return;
        }
        setError(null);
        setNotice(null);
        setSubmitting(true);
        try {
          const response = await fetch("/api/auth/forgot-password/verify", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ challengeId: draft.challengeId, code }),
          });
          const payload = await response.json() as { error?: string; data?: { resetGrant?: string } };
          if (!response.ok || !payload.data?.resetGrant) {
            throw new Error(payload.error ?? "El código no es válido.");
          }
          writePasswordResetDraft({ ...draft, resetGrant: payload.data.resetGrant });
          router.push("/forgot-password/new");
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "El código no es válido.");
        } finally {
          setSubmitting(false);
        }
      }}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="reset-code">{t("Código")}</FieldLabel>
            <Input
              id="reset-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={5}
              pattern="[0-9]{5}"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 5))}
              required
            />
          </Field>
        </FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground" role="status">{t(notice)}</p> : null}
        <Button type="submit" className="mt-1 w-full" disabled={submitting || resending}>{submitting ? t("Comprobando código…") : t("Comprobar código")}</Button>
        <Button type="button" variant="outline" className="w-full" disabled={submitting || resending} onClick={() => { void resend(); }}>
          {resending ? t("Enviando código…") : t("Pedir otro código")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">{t("Volver")}</Link>
      </p>
    </AuthShell>
  );
}
