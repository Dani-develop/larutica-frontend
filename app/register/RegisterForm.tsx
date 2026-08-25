"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const roles = [
  { id: "viajero", label: "Viajero" },
  { id: "agencia", label: "Agencia" },
  { id: "transporte", label: "Transporte" },
] as const;

type RoleId = (typeof roles)[number]["id"];

export default function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleId>("viajero");

  const needsBusinessName = role === "agencia" || role === "transporte";

  return (
    <AuthShell eyebrow="Crear cuenta" title="Registrarse">
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">
        Wireframe: elige un tipo de cuenta y continúa.
      </p>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          router.push("/login");
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="role">Tipo de cuenta</FieldLabel>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as RoleId)}
              className={cn(
                "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              )}
            >
              {roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
            <Input id="name" name="name" placeholder="Tu nombre" autoComplete="name" />
          </Field>
        </FieldGroup>

        {needsBusinessName && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="business">
                {role === "agencia" ? "Nombre de la agencia" : "Nombre del servicio"}
              </FieldLabel>
              <Input
                id="business"
                name="business"
                placeholder={
                  role === "agencia" ? "Ej. Arenal Viajes" : "Ej. Transportes Sol"
                }
              />
            </Field>
          </FieldGroup>
        )}

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
              autoComplete="new-password"
            />
          </Field>
        </FieldGroup>

        <Button type="submit" className="mt-1 w-full">
          Continuar (wireframe)
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}
