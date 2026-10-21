"use client";

import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  ImageIcon,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { PublicationForm } from "./PublicationForm";
import { PublicationDepartures } from "./PublicationDepartures";

import { usePublications } from "../hooks/usePublications";

import type {
  CreatePublicationInput,
  Publication,
} from "../types/publication.types";

type PublicationTab =
  | "general"
  | "departures"
  | "images";

function isPublicationTab(
  value: string | null,
): value is PublicationTab {
  return (
    value === "general" ||
    value === "departures" ||
    value === "images"
  );
}

export function EditPublicationPage({
  id,
}: {
  id: string;
}) {
  const { t } =
    usePreferences();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    getById,
    update,
  } =
    usePublications();

  const [
    publication,
    setPublication,
  ] =
    useState<Publication | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<PublicationTab>(
      "general",
    );

  /*
   * Permite entrar directamente a una
   * pestaña concreta, por ejemplo:
   *
   * /edit?tab=departures
   *
   * Esto hace que "Guardar y continuar"
   * desde Nueva publicación se sienta
   * como un único flujo.
   */
  useEffect(() => {
    const requestedTab =
      searchParams.get(
        "tab",
      );

    if (
      isPublicationTab(
        requestedTab,
      )
    ) {
      setActiveTab(
        requestedTab,
      );
    }
  }, [
    searchParams,
  ]);

  useEffect(() => {
    let active =
      true;

    async function loadPublication() {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getById(
            id,
          );

        if (active) {
          setPublication(
            result,
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "No se pudo cargar la publicación.",
          );
        }
      } finally {
        if (active) {
          setLoading(
            false,
          );
        }
      }
    }

    void loadPublication();

    return () => {
      active =
        false;
    };
  }, [
    getById,
    id,
  ]);

  async function handleSubmit(
    value: CreatePublicationInput,
  ) {
    const updated =
      await update(
        id,
        value,
      );

    setPublication(
      updated,
    );

    router.push(
      `/dashboard/publications/${updated.id}`,
    );
  }

  const initialValue =
    useMemo<CreatePublicationInput | null>(
      () => {
        if (
          !publication
        ) {
          return null;
        }

        return {
          journey: publication.journey ?? null,
          serviceType:
            publication.serviceType ??
            "",

          title:
            publication.title ??
            "",

          description:
            publication.description ??
            "",

          destination:
            publication.destination ??
            "",

          pricePerPerson:
            publication.pricePerPerson,

          durationMinutes:
            publication.durationMinutes,

          included:
            publication.included ??
            "",

          notIncluded:
            publication.notIncluded ??
            "",

          meetingPoint:
            publication.meetingPoint ??
            "",

          mainImageUrl:
            publication.mainImageUrl ??
            "",

          defaultCapacity:
            publication.defaultCapacity,

          languageIds:
            publication.languageIds,

          action:
            "DRAFT",
        };
      },
      [
        publication,
      ],
    );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 h-8 w-44 animate-pulse rounded bg-muted" />

        <div className="mb-6 space-y-3">
          <div className="h-7 w-72 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
        </div>

        <div className="mb-6 h-12 animate-pulse rounded-xl bg-muted" />

        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (
    error ||
    !publication ||
    !initialValue
  ) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="!m-0 text-red-800 lr-page-title">
            {t(
              "No se pudo cargar la publicación",
            )}
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error ??
              "La publicación no existe."}
          </p>

          <Button
            variant="outline"
            asChild
            className="mt-4"
          >
            <Link href="/dashboard/publications">
              {t(
                "Volver al listado",
              )}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (
    publication.status ===
    "INACTIVE"
  ) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 mb-5 h-8 gap-1.5 px-2 text-xs text-muted-foreground"
        >
          <Link
            href={`/dashboard/publications/${publication.id}`}
          >
            <ArrowLeft
              size={15}
            />

            {t(
              "Volver al detalle",
            )}
          </Link>
        </Button>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="!m-0 text-amber-900 lr-page-title">
            {t(
              "Publicación inactiva",
            )}
          </h1>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            {t(
              "Esta publicación fue desactivada y ya no puede editarse.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const tabs: {
    id: PublicationTab;
    label: string;
    icon: React.ReactNode;
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
    },
  ];

  function handleTabChange(
    tab: PublicationTab,
  ) {
    setActiveTab(
      tab,
    );

    /*
     * Limpiamos el query param después de
     * entrar al gestor para que la URL no
     * quede atada permanentemente a una pestaña.
     */
    if (
      searchParams.has(
        "tab",
      )
    ) {
      router.replace(
        `/dashboard/publications/${id}/edit`,
        {
          scroll: false,
        },
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 h-8 gap-1.5 px-2 text-xs text-muted-foreground"
        >
          <Link
            href={`/dashboard/publications/${publication.id}`}
          >
            <ArrowLeft
              size={15}
            />

            {t(
              "Volver al detalle",
            )}
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
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
                  publication.title ||
                  "Detalle",
                href:
                  `/dashboard/publications/${publication.id}`,
              },
              {
                label:
                  "Gestionar",
              },
            ]}
          />

          <h1 className="!m-0 lr-page-title">
            {t(
              "Gestionar publicación",
            )}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "Organiza tu excursión y define cuándo pueden reservar los viajeros.",
            )}
          </p>
        </div>

        <Button
          variant="outline"
          asChild
          className="self-start"
        >
          <Link
            href={`/dashboard/publications/${publication.id}`}
          >
            {t(
              "Ver publicación",
            )}
          </Link>
        </Button>
      </div>

      <div className="mb-6 border-b">
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
                activeTab ===
                tab.id;

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
                  onClick={() =>
                    handleTabChange(
                      tab.id,
                    )
                  }
                  className={[
                    "relative flex min-h-12 shrink-0 items-center gap-2 px-4 text-sm font-medium transition",
                    active
                      ? "text-[var(--primary)]"
                      : "text-muted-foreground hover:text-foreground",
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

                  {active ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--primary)]" />
                  ) : null}
                </button>
              );
            },
          )}
        </div>
      </div>

      {activeTab ===
      "general" ? (
        <PublicationForm
          allowLegacyJourney={publication.journeyRequired === false}
          initialValue={
            initialValue
          }
          draftLabel="Guardar cambios"
          submitLabel="Enviar a revisión"
          onCancel={() =>
            router.push(
              `/dashboard/publications/${publication.id}`,
            )
          }
          onSubmit={
            handleSubmit
          }
        />
      ) : null}

      {activeTab ===
      "departures" ? (
        <PublicationDepartures
          publication={
            publication
          }
        />
      ) : null}

      {activeTab ===
      "images" ? (
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div>
            <h2 className="!m-0 !text-base !font-semibold !leading-6 !tracking-normal text-[var(--ink)]">
              {t(
                "Imagen principal",
              )}
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t(
                "La imagen actual de la publicación se muestra aquí. En el siguiente ajuste moveremos la edición de imagen completamente a esta pestaña.",
              )}
            </p>
          </div>

          {publication.mainImageUrl ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  publication.mainImageUrl
                }
                alt={
                  publication.title ??
                  "Publicación"
                }
                className="h-[320px] w-full object-cover"
              />
            </div>
          ) : (
            <div className="mt-5 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-black/15 bg-muted/30">
              <div className="text-center text-muted-foreground">
                <ImageIcon
                  size={28}
                  className="mx-auto"
                />

                <p className="mt-2 text-sm">
                  {t(
                    "Esta publicación todavía no tiene una imagen principal.",
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleTabChange(
                  "general",
                )
              }
            >
              {t(
                "Editar información e imagen",
              )}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
