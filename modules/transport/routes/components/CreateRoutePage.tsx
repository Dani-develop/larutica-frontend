"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { emptyRouteInput } from "../models/Route";
import { useRoutes } from "../hooks/useRoutes";
import { RouteForm } from "./RouteForm";

export function CreateRoutePage() {
  const { t } = usePreferences();
  const router = useRouter();
  const { create } = useRoutes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/publications" className="hover:underline">{t("Rutas ")}</Link>
          <span className="text-muted-foreground">{t(" / Nueva")}</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("Nueva ruta")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Define origen, destino y el costo por persona del traslado. ")}</p>
      </div>

      <RouteForm
        initialValue={emptyRouteInput}
        submitLabel="Crear ruta"
        onCancel={() => router.push("/dashboard/publications")}
        onSubmit={(value) => {
          const created = create(value);
          router.push(`/dashboard/publications/${created.id}`);
        }}
      />
    </div>
  );
}
