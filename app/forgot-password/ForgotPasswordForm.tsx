"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  return (
    <AuthShell eyebrow="Ayuda para entrar" title="Recuperar contraseña">
      {sent ? (
        <div className="space-y-5 text-sm">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">
            Si el correo está registrado, recibirás instrucciones para crear una nueva contraseña.
          </p>
          <Link href="/login" className="block text-center font-medium text-primary underline-offset-4 hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-6 -mt-6 text-sm text-muted-foreground">
            Escribe el correo de tu cuenta y te ayudaremos a recuperar el acceso.
          </p>
          <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="recovery-email">Correo electrónico</FieldLabel>
                <Input id="recovery-email" name="email" type="email" placeholder="correo@ejemplo.com" autoComplete="email" required />
              </Field>
            </FieldGroup>
            <Button type="submit" className="mt-1 w-full">Enviar instrucciones</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Volver a iniciar sesión</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}