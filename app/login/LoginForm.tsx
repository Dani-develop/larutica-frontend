"use client";
import Link from "next/link";


import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { safeBookingReturn } from "@/modules/auth/utils/returnTo";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { useWebAuthnSupport } from "@/modules/auth/hooks/useWebAuthnSupport";
import { loginDestination } from "@/modules/landing/lib/travelerRoutes";
import { passkeyErrorMessage } from "@/modules/auth/utils/passkeyErrors";
import { signInValidators } from "@/modules/auth/validators/authValidators";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [returnTo, setReturnTo] = useState('/dashboard');
  useEffect(() => {queueMicrotask(() => setReturnTo(safeBookingReturn(new URLSearchParams(window.location.search).get('next'))));}, []);
  const { signIn, signInWithPasskey, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passkeySupported = useWebAuthnSupport();
  const next = searchParams.get("next");

  function goAfterLogin(role: string) {
    router.replace(next && safeBookingReturn(next) !== '/dashboard' ? safeBookingReturn(next) : loginDestination(role, next));
  }

  return (
    <AuthShell eyebrow="Acceso" title="Iniciar sesión">
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">
        {returnTo === '/dashboard' ? 'Ingresa para acceder a tu cuenta.' : returnTo === '/mis-reservas' ? 'Inicia sesión para consultar tus reservas y la respuesta del proveedor.' : 'Inicia sesión para continuar con tu reserva. Conservaremos la salida y las personas que elegiste.'}
      </p>

      <form method="post"
        className="flex flex-col gap-5"
        aria-busy={submitting}
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const form = new FormData(event.currentTarget);
          const parsed = signInValidators.safeParse({
            email: form.get("email"),
            password: form.get("password"),
          });
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
            return;
          }
          setSubmitting(true);
          try {
            const signedIn = await signIn(parsed.data);
            goAfterLogin(signedIn.role);
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar sesión.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FieldGroup><Field><FieldLabel htmlFor="email">Correo electrónico</FieldLabel><Input id="email" name="email" type="email" placeholder="correo@ejemplo.com" autoComplete="email" required /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="password">Contraseña</FieldLabel><div className="relative"><Input id="password" name="password" type={showPassword ? 'text' : 'password'} className="h-11 pr-12" placeholder="••••••••" autoComplete="current-password" required /><button type="button" className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}</button></div></Field></FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="-mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href={`/register?next=${encodeURIComponent(returnTo)}`} className="font-semibold text-primary underline-offset-4 hover:underline">Registrarse</Link>
          <Link href="/forgot-password" className="ml-auto font-medium text-primary underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</Link>
        </div>
        <Button type="submit" className="mt-1 w-full" disabled={submitting || authLoading}>{submitting ? "Validando..." : "Iniciar sesión"}</Button>
      </form>

      {passkeySupported ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting || authLoading}
            onClick={async () => {
              setError(null);
              setSubmitting(true);
              try {
                const signedIn = await signInWithPasskey();
                goAfterLogin(signedIn.role);
              } catch (nextError) {
                setError(passkeyErrorMessage(nextError, "No se pudo iniciar sesión con la passkey."));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <KeyRound aria-hidden="true" />
            Usar llave de acceso
          </Button>
        </>
      ) : null}

    </AuthShell>
  );
}
