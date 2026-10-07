"use client";
import { usePreferences } from "@/lib/preferences/Preferences";
import Link from "next/link";


import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { safeBookingReturn } from "@/modules/auth/utils/returnTo";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { useWebAuthnSupport } from "@/modules/auth/hooks/useWebAuthnSupport";
import { loginDestination } from "@/modules/landing/lib/travelerRoutes";
import { passkeyErrorMessage } from "@/modules/auth/utils/passkeyErrors";
import { signInValidators } from "@/modules/auth/validators/authValidators";
import { SignInDtoDefaultValues } from "@/modules/auth/models/auth";

export default function LoginForm() {
  const { t } = usePreferences();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [returnTo, setReturnTo] = useState('/dashboard');
  useEffect(() => { queueMicrotask(() => setReturnTo(safeBookingReturn(new URLSearchParams(window.location.search).get('next')))); }, []);
  const { signIn, signInWithPasskey, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passkeySupported = useWebAuthnSupport();
  const next = searchParams.get("next");

  function goAfterLogin(role: string) {
    router.replace(next && safeBookingReturn(next) !== '/dashboard' ? safeBookingReturn(next) : loginDestination(role, next));
  }

  const form = useForm({
    defaultValues: { ...SignInDtoDefaultValues },
    validators: { onSubmit: signInValidators },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const signedIn = await signIn({ ...value, email: value.email.trim() });
        goAfterLogin(signedIn.role);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar sesión.");
      }
    },
  });
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const submitting = isSubmitting || passkeySubmitting;

  return (
    <AuthShell eyebrow={t("Acceso")} title={t("Iniciar sesión")}>
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">
        {returnTo === '/dashboard' ? t("Ingresa para acceder a tu cuenta.") : returnTo === '/mis-reservas' ? t("Inicia sesión para consultar tus reservas y la respuesta del proveedor.") : t("Inicia sesión para continuar con tu reserva. Conservaremos la salida y las personas que elegiste.")}
      </p>

      <form method="post"
        className="flex flex-col gap-5"
        noValidate
        aria-busy={submitting}
        onSubmit={(event) => {
          event.preventDefault();
          if (submitting || authLoading) return;
          setError(null);
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field name="email">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="email">{t("Correo electrónico")}</FieldLabel>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="email" name="email" type="email" className="h-11 pl-10" placeholder={t("correo@ejemplo.com")} autoComplete="email" required value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} onBlur={field.handleBlur} aria-invalid={isInvalid} aria-describedby={isInvalid ? "email-error" : undefined} />
                  </div>
                  {isInvalid ? <FieldError id="email-error" errors={field.state.meta.errors.map(issue => issue ? { ...issue, message: t(issue.message) } : issue)} /> : null}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>
        <FieldGroup>
          <form.Field name="password">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="password">{t("Contraseña")}</FieldLabel>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="password" name="password" type={showPassword ? 'text' : 'password'} className="h-11 pl-10 pr-12" placeholder={t("••••••••")} autoComplete="current-password" required value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} onBlur={field.handleBlur} aria-invalid={isInvalid} aria-describedby={isInvalid ? "password-error" : undefined} />
                    <button type="button" className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={showPassword ? t("Ocultar contraseña") : t("Mostrar contraseña")} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                  {isInvalid ? <FieldError id="password-error" errors={field.state.meta.errors.map(issue => issue ? { ...issue, message: t(issue.message) } : issue)} /> : null}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
        <div className="-mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href={`/register?next=${encodeURIComponent(returnTo)}`} className="font-semibold text-primary underline-offset-4 hover:underline">{t("Registrarse")}</Link>
          <Link href="/forgot-password" className="ml-auto font-medium text-primary underline-offset-4 hover:underline">{t("¿Olvidaste tu contraseña?")}</Link>
        </div>
        <Button type="submit" className="mt-1 w-full" disabled={submitting || authLoading}>{submitting ? t("Validando...") : t("Iniciar sesión")}</Button>
      </form>

      {passkeySupported ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />{t("o")}<span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting || authLoading}
            onClick={async () => {
              setError(null);
              setPasskeySubmitting(true);
              try {
                const signedIn = await signInWithPasskey();
                goAfterLogin(signedIn.role);
              } catch (nextError) {
                setError(passkeyErrorMessage(nextError, "No se pudo iniciar sesión con la passkey."));
              } finally {
                setPasskeySubmitting(false);
              }
            }}
          >
            <KeyRound aria-hidden="true" />{t("Usar llave de acceso ")}</Button>
        </>
      ) : null}

    </AuthShell>
  );
}
