"use client";

import { useState } from "react";
import {
  DASHBOARD_ROLES,
  type DashboardRole,
} from "@/components/dashboard/dashboard-role-context";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { isOptionalPhoneNumber } from "@/lib/phoneValidation";
import type { SystemUserInput, UserStatus } from "../models/User";

type UserFormProps = {
  initialValue: SystemUserInput;
  submitLabel: string;
  /** Si es true, el rol no se puede cambiar (perfil propio). */
  lockRole?: boolean;
  lockEmail?: boolean;
  lockStatus?: boolean;
  requirePassword?: boolean;
  onSubmit: (value: SystemUserInput) => void | Promise<void>;
  onCancel: () => void;
};

const selectClassName =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function UserForm({
  initialValue,
  submitLabel,
  lockRole = false,
  lockEmail = false,
  lockStatus = false,
  requirePassword = false,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [value, setValue] = useState<SystemUserInput>(initialValue);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const needsBusiness =
    value.role === "Agencia" || value.role === "Transporte";

  function patch<K extends keyof SystemUserInput>(
    key: K,
    next: SystemUserInput[K],
  ) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const phone = value.phone.trim();
        if (!isOptionalPhoneNumber(phone)) {
          setPhoneError("Ingresa un número de teléfono válido.");
          return;
        }
        setPhoneError(null);
        void onSubmit({
          ...value,
          name: value.name.trim(),
          email: value.email.trim(),
          phone,
          businessName: value.businessName.trim(),
        });
      }}
    >
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">Datos de la cuenta</h2>
          <p className="text-sm text-muted-foreground">
            Información básica del usuario en LaRutica.
          </p>
        </div>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
            <Input
              id="name"
              value={value.name}
              onChange={(event) => patch("name", event.target.value)}
              placeholder="Nombre y apellidos"
              minLength={2}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              type="email"
              value={value.email}
              disabled={lockEmail}
              onChange={(event) => patch("email", event.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="role">Rol</FieldLabel>
              <select
                id="role"
                value={value.role}
                disabled={lockRole}
                onChange={(event) =>
                  patch("role", event.target.value as DashboardRole)
                }
                className={selectClassName}
              >
                {DASHBOARD_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Estado</FieldLabel>
              <select
                id="status"
                value={value.status}
                disabled={lockStatus}
                onChange={(event) =>
                  patch("status", event.target.value as UserStatus)
                }
                className={selectClassName}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </Field>
          </div>

          <Field data-invalid={phoneError ? true : undefined}>
            <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
            <PhoneNumberInput
              id="phone"
              value={value.phone}
              onChange={(next) => {
                setPhoneError(null);
                patch("phone", next);
              }}
              aria-invalid={Boolean(phoneError)}
            />
            {phoneError ? (
              <p className="text-sm text-destructive" role="alert">
                {phoneError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Formato internacional (Costa Rica por defecto).
              </p>
            )}
          </Field>

          {needsBusiness && (
            <Field>
              <FieldLabel htmlFor="businessName">
                {value.role === "Agencia"
                  ? "Nombre de la agencia"
                  : "Nombre del servicio"}
              </FieldLabel>
              <Input
                id="businessName"
                value={value.businessName}
                onChange={(event) => patch("businessName", event.target.value)}
                placeholder={
                  value.role === "Agencia"
                    ? "Ej. Arenal Viajes"
                    : "Ej. Transportes Sol"
                }
              />
            </Field>
          )}

          {requirePassword && (
            <Field>
              <FieldLabel htmlFor="password">Contraseña temporal</FieldLabel>
              <Input
                id="password"
                type="password"
                value={value.password ?? ""}
                onChange={(event) => patch("password", event.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </Field>
          )}
        </FieldGroup>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
