"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";

export default function LoginForm() {
  const router = useRouter();

  return (
    <AuthShell eyebrow="Acceso" title="Iniciar sesión">
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">
        Wireframe: sin autenticación real todavía.
      </p>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          router.push("/dashboard");
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>
        </FieldGroup>

        <Button type="submit" className="mt-1 w-full">
          Continuar al dashboard
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Registrarse
        </Link>
      </p>
    </AuthShell>
  );
}
