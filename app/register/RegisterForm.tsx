"use client";
import Link from "next/link";

import { useState, useEffect } from "react";
import { ArrowRight, Building2, Bus, Compass } from "lucide-react";
import { safeBookingReturn } from "@/modules/auth/utils/returnTo";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { isOptionalPhoneNumber } from "@/lib/phoneValidation";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { signUpValidators } from "@/modules/auth/validators/authValidators";
import { ROLE_OPTIONS, type AuthRole } from "@/modules/auth/models/auth";

const roleIcons = { Viajero: Compass, Agencia: Building2, Transporte: Bus };

export default function RegisterForm() {
  const [returnTo, setReturnTo] = useState('/dashboard');
  useEffect(() => {queueMicrotask(() => setReturnTo(safeBookingReturn(new URLSearchParams(window.location.search).get('next'))));}, []);
  const { signUp, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AuthRole | null>(null);
  const [phone, setPhone] = useState("");
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

  if (!role) {
    return (
      <AuthShell eyebrow="Crear cuenta" title="Crear cuenta">
        <p className="mb-6 -mt-6 text-sm text-muted-foreground">Elige tu tipo de cuenta para comenzar el registro.</p>
        <div className="grid gap-3" aria-label="Tipo de cuenta">
          {ROLE_OPTIONS.map((option) => {
            const Icon = roleIcons[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-background p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={24} aria-hidden="true" /></span>
                <span className="flex-1"><span className="block font-semibold text-foreground">{option.title}</span><span className="mt-1 block text-sm text-muted-foreground">{option.description}</span></span>
                <ArrowRight size={18} className="shrink-0 text-primary" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tienes cuenta?{" "}<Link href={`/login?next=${encodeURIComponent(returnTo)}`} className="font-medium text-primary underline-offset-4 hover:underline">Iniciar sesión</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Crear cuenta" title={`Regístrate como ${role.toLowerCase()}`}>
      <div className="mb-6 -mt-6 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">Completa tus datos para crear tu cuenta.</p>
        <button type="button" disabled={submitting} onClick={() => { setRole(null); setError(null); }} className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">Cambiar tipo de cuenta</button>
      </div>
      <form method="post"
        className="flex flex-col gap-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const form = new FormData(event.currentTarget);
          if (!isOptionalPhoneNumber(phone)) {
            setError("Ingresa un número de teléfono válido.");
            return;
          }
          const parsed = signUpValidators.safeParse({
            role,
            fullName: form.get("fullName"),
            email: form.get("email"),
            phone,
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
        <input type="hidden" name="role" value={role} />
        <FieldGroup><Field><FieldLabel htmlFor="fullName" required>Nombre completo</FieldLabel><Input id="fullName" name="fullName" placeholder="Tu nombre" autoComplete="name" required /></Field></FieldGroup>
        {needsBusinessName ? <FieldGroup><Field><FieldLabel htmlFor="companyName" required>{role === "Agencia" ? "Nombre de la agencia" : "Nombre del servicio"}</FieldLabel><Input id="companyName" name="companyName" placeholder={role === "Agencia" ? "Ej. Arenal Viajes" : "Ej. Transportes Sol"} required /></Field></FieldGroup> : <input type="hidden" name="companyName" value="" />}
        <FieldGroup><Field><FieldLabel htmlFor="phone" required={needsBusinessName}>Teléfono</FieldLabel><PhoneNumberInput id="phone" name="phone" value={phone} onChange={setPhone} required={needsBusinessName} /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="email" required>Correo electrónico</FieldLabel><Input id="email" name="email" type="email" placeholder="correo@ejemplo.com" autoComplete="email" required /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="password" required>Contraseña</FieldLabel><Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} required /></Field></FieldGroup>
        <FieldGroup><Field><FieldLabel htmlFor="confirmPassword" required>Confirmar contraseña</FieldLabel><Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repite la contraseña" autoComplete="new-password" minLength={8} required /></Field></FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button type="submit" className="mt-1 w-full" disabled={submitting || authLoading}>{submitting ? "Creando cuenta..." : "Crear cuenta"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tienes cuenta?{" "}<Link href={`/login?next=${encodeURIComponent(returnTo)}`} className="font-medium text-primary underline-offset-4 hover:underline">Iniciar sesión</Link></p>
    </AuthShell>
  );
}
