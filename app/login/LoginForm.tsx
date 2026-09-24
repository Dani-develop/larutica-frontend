"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { useWebAuthnSupport } from "@/modules/auth/hooks/useWebAuthnSupport";
import { passkeyErrorMessage } from "@/modules/auth/utils/passkeyErrors";
import { signInValidators } from "@/modules/auth/validators/authValidators";

export default function LoginForm() {
  const router = useRouter();
  const { signIn, signInWithPasskey } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passkeySupported = useWebAuthnSupport();

  return (
    <AuthShell eyebrow="Acceso" title="Iniciar sesión">
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">
        Accede con la cuenta almacenada de forma segura en Supabase.
      </p>

      <form
        className="flex flex-col gap-5"
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
            await signIn(parsed.data);
            router.replace("/dashboard");
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar sesión.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FieldGroup><Field><FieldLabel htmlFor="email">Correo electrónico</FieldLabel><Input id="email" name="email" type="email" placeholder="correo@ejemplo.com" autoComplete="email" required /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="password">Contraseña</FieldLabel><Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required /></Field></FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <p className="-mt-2 text-right text-sm"><Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</Link></p>
        <Button type="submit" className="mt-1 w-full" disabled={submitting}>{submitting ? "Validando..." : "Continuar al dashboard"}</Button>
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
            disabled={submitting}
            onClick={async () => {
              setError(null);
              setSubmitting(true);
              try {
                await signInWithPasskey();
                router.replace("/dashboard");
              } catch (nextError) {
                setError(passkeyErrorMessage(nextError, "No se pudo iniciar sesión con la passkey."));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <KeyRound aria-hidden="true" />
            Iniciar sesión con passkey
          </Button>
        </>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">¿No tienes cuenta?{" "}<Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">Registrarse</Link></p>
    </AuthShell>
  );
}
