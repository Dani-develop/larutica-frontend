"use client";
import Link from "next/link";

import { useState, useEffect } from "react";
import { safeBookingReturn } from "@/modules/auth/utils/returnTo";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { signUpValidators } from "@/modules/auth/validators/authValidators";
import type { AuthRole } from "@/modules/auth/models/auth";

const roles: { id: AuthRole; label: string }[] = [
  { id: "Viajero", label: "Viajero" },
  { id: "Agencia", label: "Agencia" },
  { id: "Transporte", label: "Transporte" },
];

export default function RegisterForm() {
  const [returnTo, setReturnTo] = useState('/dashboard');
  useEffect(() => {queueMicrotask(() => setReturnTo(safeBookingReturn(new URLSearchParams(window.location.search).get('next'))));}, []);
  const { signUp, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AuthRole>("Viajero");
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const needsBusinessName = role === "Agencia" || role === "Transporte";

  if (confirmationSent) {
    return (
      <AuthShell eyebrow="Cuenta creada" title="Confirma tu correo">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">Tu perfil ya quedó registrado. Revisa tu correo para activar la cuenta y luego inicia sesión.</p>
        <Button asChild className="mt-6 w-full"><Link href={`/login?next=${encodeURIComponent(returnTo)}`}>Ir a iniciar sesión</Link></Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Crear cuenta" title="Registrarse">
      <p className="mb-6 -mt-6 text-sm text-muted-foreground">Tus datos se compartirán entre el perfil y los módulos autorizados.</p>
      <form method="post"
        className="flex flex-col gap-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const form = new FormData(event.currentTarget);
          const parsed = signUpValidators.safeParse({
            role,
            fullName: form.get("fullName"),
            email: form.get("email"),
            phone: form.get("phone"),
            companyName: form.get("companyName") ?? "",
            password: form.get("password"),
            confirmPassword: form.get("confirmPassword"),
          });
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
            return;
          }
          setSubmitting(true);
          try {
            const result = await signUp(parsed.data);
            if (result.requiresEmailConfirmation) setConfirmationSent(true);
            else window.location.assign(returnTo);
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "No se pudo crear la cuenta.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <FieldGroup><Field><FieldLabel htmlFor="role">Tipo de cuenta</FieldLabel><select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value as AuthRole)} className={cn("border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none", "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]")}>{roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="fullName">Nombre completo</FieldLabel><Input id="fullName" name="fullName" placeholder="Tu nombre" autoComplete="name" required /></Field></FieldGroup>
        {needsBusinessName ? <FieldGroup><Field><FieldLabel htmlFor="companyName">{role === "Agencia" ? "Nombre de la agencia" : "Nombre del servicio"}</FieldLabel><Input id="companyName" name="companyName" placeholder={role === "Agencia" ? "Ej. Arenal Viajes" : "Ej. Transportes Sol"} required /></Field></FieldGroup> : <input type="hidden" name="companyName" value="" />}
        <FieldGroup><Field><FieldLabel htmlFor="phone">Teléfono{role === "Viajero" ? " (opcional)" : ""}</FieldLabel><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+506 0000-0000" required={needsBusinessName} /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="email">Correo electrónico</FieldLabel><Input id="email" name="email" type="email" placeholder="correo@ejemplo.com" autoComplete="email" required /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="password">Contraseña</FieldLabel><Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} required /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel><Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repite la contraseña" autoComplete="new-password" minLength={8} required /></Field></FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button type="submit" className="mt-1 w-full" disabled={submitting || authLoading}>{submitting ? "Creando cuenta..." : "Crear cuenta"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tienes cuenta?{" "}<Link href={`/login?next=${encodeURIComponent(returnTo)}`} className="font-medium text-primary underline-offset-4 hover:underline">Iniciar sesión</Link></p>
    </AuthShell>
  );
}
