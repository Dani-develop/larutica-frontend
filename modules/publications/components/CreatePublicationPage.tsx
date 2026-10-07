"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PublicationForm } from "./PublicationForm";

import { usePublications } from "../hooks/usePublications";

import {
  emptyPublicationInput,
  type CreatePublicationInput,
} from "../types/publication.types";

export function CreatePublicationPage() {
  const { t } = usePreferences();
  const router =
    useRouter();

  const {
    create,
  } =
    usePublications();

  async function handleSubmit(
    value: CreatePublicationInput,
  ) {
    const created =
      await create(
        value,
      );

    /*
     * Después de crear correctamente
     * la publicación, enviamos al usuario
     * al detalle de la publicación.
     */
    router.push(
      `/dashboard/publications/${created.id}`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Navegación */}
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 h-8 gap-1.5 px-2 text-xs text-muted-foreground"
        >
          <Link href="/dashboard/publications">
            <ArrowLeft
              size={15}
            />{t("Volver a publicaciones ")}</Link>
        </Button>
      </div>

      {/* Encabezado */}
      <div className="mb-6">
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Publicaciones", href: "/dashboard/publications" }, { label: "Nueva publicación" }]} />

        <h1 className="!m-0 !text-[26px] !font-semibold !leading-tight !tracking-tight text-[#123a30]">{t("Nueva publicación ")}</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Completa la información del servicio que deseas ofrecer en LaRutica. Puedes guardar el formulario como borrador y terminarlo más adelante. ")}</p>
      </div>

      {/* Aviso */}
      <div className="mb-5 rounded-xl border border-[#cfe3dc] bg-[#f3faf7] px-4 py-3">
        <p className="text-xs leading-5 text-[#315c50]">{t("Las publicaciones enviadas a revisión serán evaluadas antes de estar disponibles para los viajeros. ")}</p>
      </div>

      {/* Formulario */}
      <PublicationForm
        initialValue={
          emptyPublicationInput
        }
        draftLabel="Guardar borrador"
        submitLabel="Enviar a revisión"
        onCancel={() =>
          router.push(
            "/dashboard/publications",
          )
        }
        onSubmit={
          handleSubmit
        }
      />
    </div>
  );
}