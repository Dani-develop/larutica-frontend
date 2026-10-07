"use client";
import Link from "next/link";

import { useState, useEffect, type ComponentProps } from "react";
import { useForm } from "@tanstack/react-form";
import { ArrowRight, Building2, Bus, Compass, Eye, EyeOff, LockKeyhole, Mail, UserRound, type LucideIcon } from "lucide-react";
import { safeBookingReturn } from "@/modules/auth/utils/returnTo";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { signUpValidators } from "@/modules/auth/validators/authValidators";
import { ROLE_OPTIONS, SignUpDtoDefaultValues, type AuthRole } from "@/modules/auth/models/auth";

const roleIcons = { Viajero: Compass, Agencia: Building2, Transporte: Bus };

function RegisterInput({ icon: Icon, type, ...props }: ComponentProps<typeof Input> & { icon: LucideIcon }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input {...props} type={isPassword && visible ? "text" : type} className={`h-11 pl-10 ${isPassword ? "pr-12" : ""}`} />
      {isPassword ? (
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex min-w-11 cursor-pointer items-center justify-center rounded-md text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${props.name === "confirmPassword" ? "confirmación de contraseña" : "contraseña"}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      ) : null}
    </div>
  );
}

export default function RegisterForm() {
  const [returnTo, setReturnTo] = useState('/dashboard');
  useEffect(() => {queueMicrotask(() => setReturnTo(safeBookingReturn(new URLSearchParams(window.location.search).get('next'))));}, []);
  const { signUp, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AuthRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const needsBusinessName = role === "Agencia" || role === "Transporte";
  const form = useForm({
    defaultValues: { ...SignUpDtoDefaultValues, role: "Viajero" as AuthRole },
    validators: { onSubmit: signUpValidators },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await signUp({
          ...value,
          fullName: value.fullName.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          companyName: value.companyName.trim(),
        });
        if (result.requiresEmailConfirmation) setConfirmationSent(true);
        else window.location.assign(returnTo);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "No se pudo crear la cuenta.");
      }
    },
  });

  const inputFields: Array<{
    name: "fullName" | "companyName" | "email" | "password" | "confirmPassword";
    label: string;
    icon: LucideIcon;
    placeholder: string;
    type?: string;
    autoComplete?: string;
    minLength?: number;
  }> = [
    { name: "fullName", label: "Nombre completo", icon: UserRound, placeholder: "Tu nombre", autoComplete: "name" },
    ...(needsBusinessName ? [{ name: "companyName" as const, label: role === "Agencia" ? "Nombre de la agencia" : "Nombre del servicio", icon: role === "Agencia" ? Building2 : Bus, placeholder: role === "Agencia" ? "Ej. Arenal Viajes" : "Ej. Transportes Sol", autoComplete: "organization" }] : []),
    { name: "email", label: "Correo electrónico", icon: Mail, placeholder: "correo@ejemplo.com", type: "email", autoComplete: "email" },
    { name: "password", label: "Contraseña", icon: LockKeyhole, placeholder: "Mínimo 8 caracteres", type: "password", autoComplete: "new-password", minLength: 8 },
    { name: "confirmPassword", label: "Confirmar contraseña", icon: LockKeyhole, placeholder: "Repite la contraseña", type: "password", autoComplete: "new-password", minLength: 8 },
  ];

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
                onClick={() => {
                  form.reset({ ...form.state.values, role: option.value, companyName: option.value === "Viajero" ? "" : form.state.values.companyName });
                  setRole(option.value);
                }}
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
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => <button type="button" disabled={isSubmitting} onClick={() => { setRole(null); setError(null); }} className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">Cambiar tipo de cuenta</button>}
        </form.Subscribe>
      </div>
      <form method="post"
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void form.handleSubmit();
        }}
      >
        <input type="hidden" name="role" value={role} />
        {inputFields.map((config) => (
          <FieldGroup key={config.name}>
            <form.Field name={config.name}>
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name} required>{config.label}</FieldLabel>
                    <RegisterInput
                      icon={config.icon}
                      id={field.name}
                      name={field.name}
                      type={config.type}
                      placeholder={config.placeholder}
                      autoComplete={config.autoComplete}
                      minLength={config.minLength}
                      required
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={isInvalid}
                      aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                    />
                    {isInvalid ? <FieldError id={`${field.name}-error`} errors={field.state.meta.errors} /> : null}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        ))}
        <FieldGroup>
          <form.Field name="phone">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name} required={needsBusinessName}>Teléfono</FieldLabel>
                  <PhoneNumberInput id={field.name} name={field.name} value={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} required={needsBusinessName} className="h-11" aria-invalid={isInvalid} aria-describedby={isInvalid ? "phone-error" : undefined} />
                  {isInvalid ? <FieldError id="phone-error" errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => <Button type="submit" className="mt-1 w-full" disabled={isSubmitting || authLoading}>{isSubmitting ? "Creando cuenta..." : "Crear cuenta"}</Button>}
        </form.Subscribe>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tienes cuenta?{" "}<Link href={`/login?next=${encodeURIComponent(returnTo)}`} className="font-medium text-primary underline-offset-4 hover:underline">Iniciar sesión</Link></p>
    </AuthShell>
  );
}
