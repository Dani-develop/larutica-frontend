"use client";

import { useState } from "react";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserForm } from "./UserForm";
import { UserStatusBadge } from "./UserStatusBadge";

export function MyProfilePage() {
  const { user: profile, saveProfile } = useAuth();
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) return <p className="text-sm text-muted-foreground">Cargando perfil...</p>;
  const id = profile.id;
  const initialValue = {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone,
    businessName: profile.businessName,
    status: profile.status,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-xl font-semibold tracking-tight">Mi perfil</h1><p className="mt-1 text-sm text-muted-foreground">Los cambios se guardan en la cuenta compartida de LaRutica.</p></div>
      <Card className="shadow-xs"><CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0"><div><CardTitle className="text-base">{profile.name}</CardTitle><CardDescription>{profile.role}{profile.businessName ? ` · ${profile.businessName}` : ""}</CardDescription></div><UserStatusBadge status={profile.status} /></CardHeader><CardContent className="text-sm text-muted-foreground">{profile.email}</CardContent></Card>
      {message ? <p className="text-sm text-primary" role="status">{message}</p> : null}
      <UserForm
        key={`${id}-${formKey}`}
        initialValue={initialValue}
        submitLabel="Guardar perfil"
        lockRole
        lockEmail
        lockStatus
        onCancel={() => { setMessage(null); setFormKey((current) => current + 1); }}
        onSubmit={async (value) => {
          try {
            await saveProfile({ name: value.name, phone: value.phone, businessName: value.businessName });
            setMessage("Perfil actualizado en todos los módulos.");
            setFormKey((current) => current + 1);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
          }
        }}
      />
    </div>
  );
}
