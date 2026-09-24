"use client";

import { useState } from "react";
import { Home, Mail, Phone } from "lucide-react";
import { parsePhoneNumber } from "react-phone-number-input";
import { getInitials } from "@/components/app-sidebar/user-avatar-utils";
import type { DashboardRole } from "@/components/dashboard/dashboard-role-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth/context/AuthContext";
import type { UserStatus } from "../models/User";
import { UserForm } from "./UserForm";

const roleBadgeClass: Record<DashboardRole, string> = {
  Admin: "bg-blue-100 text-blue-700 border-blue-200",
  Agencia: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Transporte: "bg-amber-100 text-amber-700 border-amber-200",
  Viajero: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusBadgeClass: Record<UserStatus, string> = {
  Activo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Inactivo: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatPhone(phone: string): string {
  try {
    return parsePhoneNumber(phone)?.formatInternational() ?? phone;
  } catch {
    return phone;
  }
}

function RoleBadge({ role }: { role: DashboardRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium",
        roleBadgeClass[role],
      )}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium",
        statusBadgeClass[status],
      )}
    >
      {status}
    </span>
  );
}

export function MyProfilePage() {
  const { user: profile, saveProfile } = useAuth();
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!profile) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const initialValue = {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone,
    businessName: profile.businessName,
    status: profile.status,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList className="!text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="flex items-center gap-1.5 !text-sm"
            >
              <Home className="size-3.5" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="!text-sm">Mi perfil</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="!m-0 !max-w-none !text-2xl !leading-8 !font-semibold !tracking-tight">
          Mi perfil
        </h1>
        <p className="text-muted-foreground mt-0.5 !text-sm !leading-5">
          Actualiza tus datos personales. El rol y el estado los administra el
          sistema.
        </p>
      </div>

      <div className="bg-card overflow-hidden rounded-xl">
        <div className="flex items-start gap-4 p-5">
          <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <span className="text-primary !text-sm !font-semibold">
              {getInitials(profile.name, profile.email)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="!m-0 truncate !text-base !font-semibold !leading-6">
                {profile.name}
              </p>
              <RoleBadge role={profile.role} />
              <StatusBadge status={profile.status} />
            </div>
            {profile.businessName ? (
              <p className="text-muted-foreground mt-1 !text-sm">
                {profile.businessName}
              </p>
            ) : null}
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="text-muted-foreground flex items-center gap-2 !text-sm">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{profile.email || "Sin correo"}</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 !text-sm">
                <Phone className="size-3.5 shrink-0" />
                <span>
                  {profile.phone ? formatPhone(profile.phone) : "Sin teléfono"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 !text-sm",
            isError
              ? "border-destructive/20 bg-destructive/5 text-destructive"
              : "border-primary/20 bg-primary/5 text-primary",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="bg-card overflow-hidden rounded-xl">
        <div className="border-b px-5 py-4">
          <h2 className="!m-0 !max-w-none !text-base !leading-6 !font-semibold !tracking-normal">
            Editar información
          </h2>
          <p className="text-muted-foreground mt-0.5 !text-sm">
            Nombre, teléfono y datos de negocio.
          </p>
        </div>
        <div className="p-5">
          <UserForm
            key={`${profile.id}-${formKey}`}
            initialValue={initialValue}
            submitLabel="Guardar perfil"
            lockRole
            lockEmail
            lockStatus
            onCancel={() => {
              setMessage(null);
              setIsError(false);
              setFormKey((current) => current + 1);
            }}
            onSubmit={async (value) => {
              try {
                await saveProfile({
                  name: value.name,
                  phone: value.phone,
                  businessName: value.businessName,
                });
                setIsError(false);
                setMessage("Perfil actualizado correctamente.");
                setFormKey((current) => current + 1);
              } catch (error) {
                setIsError(true);
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "No se pudo actualizar el perfil.",
                );
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
