"use client";

import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  ImageIcon,
  Info,
  LockKeyhole,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { PublicationForm } from "./PublicationForm";

import { usePublications } from "../hooks/usePublications";

import {
  emptyPublicationInput,
  type CreatePublicationInput,
} from "../types/publication.types";

type PublicationTab =
  | "general"
  | "departures"
  | "images";

export function CreatePublicationPage() {
  const { t } = usePreferences();
  const router = useRouter();

  const {
    create,
  } = usePublications();

  async function handleSubmit(
    value: CreatePublicationInput,
  ) {
    const created =
      await create(
        value,
      );

    /*
     * Guardar y continuar:
     * crea primero la publicación para obtener
     * el ID necesario por publication_departures
     * y abre directamente "Salidas y cupos".
     */
    if (
      value.action ===
      "DRAFT"
    ) {
      router.push(
        `/dashboard/publications/${created.id}/edit?tab=departures`,
      );

      return;
    }

    /*
     * Si se envía directamente a revisión,
     * mantenemos el comportamiento normal
     * y vamos al detalle.
     */
    router.push(
      `/dashboard/publications/${created.id}`,
    );
  }

  const tabs: {
    id: PublicationTab;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }[] = [
    {
      id: "general",
      label:
        "Información general",
      icon: (
        <Info
          size={18}
        />
      ),
    },
    {
      id: "departures",
      label:
        "Salidas y cupos",
      icon: (
        <CalendarDays
          size={18}
        />
      ),
      disabled: true,
    },
    {
      id: "images",
      label:
        "Imágenes",
      icon: (
        <ImageIcon
          size={18}
        />
      ),
      disabled: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Volver */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 h-8 gap-1.5 px-2 text-xs text-muted-foreground"
        >
          <Link href="/dashboard/publications">
            <ArrowLeft
              size={15}
            />

            {t(
              "Volver a publicaciones",
            )}
          </Link>
        </Button>
      </div>

      {/* Encabezado */}
      <div className="mb-5">
        <DashboardBreadcrumb
          className="mb-2"
          items={[
            {
              label:
                "Publicaciones",
              href:
                "/dashboard/publications",
            },
            {
              label:
                "Nueva publicación",
            },
          ]}
        />

        <h1 className="!m-0 lr-page-title">
          {t(
            "Nueva publicación",
          )}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "Configura la información de tu experiencia antes de enviarla a revisión.",
          )}
        </p>
      </div>

      {/* Navegación principal */}
      <div className="mb-5 border-b">
        <div
          className="flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label={t(
            "Secciones de la publicación",
          )}
        >
          {tabs.map(
            (tab) => {
              const active =
                tab.id ===
                "general";

              return (
                <button
                  key={
                    tab.id
                  }
                  type="button"
                  role="tab"
                  aria-selected={
                    active
                  }
                  aria-disabled={
                    tab.disabled
                  }
                  disabled={
                    tab.disabled
                  }
                  title={
                    tab.disabled
                      ? t(
                          "Disponible después de guardar la publicación.",
                        )
                      : undefined
                  }
                  className={[
                    "relative flex min-h-12 shrink-0 items-center gap-2 px-4 text-sm font-medium transition",
                    active
                      ? "text-[var(--primary)]"
                      : "text-muted-foreground",
                    tab.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:text-foreground",
                  ].join(
                    " ",
                  )}
                >
                  {tab.icon}

                  <span>
                    {t(
                      tab.label,
                    )}
                  </span>

                  {tab.disabled ? (
                    <LockKeyhole
                      size={13}
                      className="ml-0.5 opacity-70"
                    />
                  ) : null}

                  {active ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--primary)]" />
                  ) : null}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Aviso compacto */}
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#dcebe5] bg-[#f6fbf9] px-4 py-3 text-xs leading-5 text-[#315c50]">
        <Info
          size={15}
          className="mt-0.5 shrink-0 text-[var(--primary)]"
        />

        <p>
          {t(
            "Completa la información general y guarda para continuar con las salidas y cupos.",
          )}
        </p>
      </div>

      {/* Formulario */}
      <PublicationForm
        initialValue={
          emptyPublicationInput
        }
        draftLabel="Guardar y continuar"
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
