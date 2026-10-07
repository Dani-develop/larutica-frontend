"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PublicationForm } from "./PublicationForm";

import { usePublications } from "../hooks/usePublications";

import type {
  CreatePublicationInput,
  Publication,
} from "../types/publication.types";

export function EditPublicationPage({
  id,
}: {
  id: string;
}) {
  const { t } = usePreferences();
  const router =
    useRouter();

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

  useEffect(() => {
    let active = true;

    async function loadPublication() {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getById(id);

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
          setLoading(false);
        }
      }
    }

    void loadPublication();

    return () => {
      active = false;
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

    router.push(
      `/dashboard/publications/${updated.id}`,
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5 h-8 w-44 animate-pulse rounded bg-muted" />

        <div className="mb-6 space-y-3">
          <div className="h-7 w-56 animate-pulse rounded bg-muted" />

          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl bg-muted"
              />
            ),
          )}
        </div>
      </div>
    );
  }

  if (
    error ||
    !publication
  ) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="!m-0 !text-lg !font-semibold !tracking-normal text-red-800">{t("No se pudo cargar la publicación ")}</h1>

          <p className="mt-2 text-sm text-red-700">
            {error ??
              "La publicación no existe."}
          </p>

          <Button
            variant="outline"
            asChild
            className="mt-4"
          >
            <Link href="/dashboard/publications">{t("Volver al listado ")}</Link>
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
      <div className="mx-auto w-full max-w-5xl">
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
            />{t("Volver al detalle ")}</Link>
        </Button>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="!m-0 !text-lg !font-semibold !tracking-normal text-amber-900">{t("Publicación inactiva ")}</h1>

          <p className="mt-2 text-sm leading-6 text-amber-800">{t("Esta publicación fue desactivada y ya no puede editarse. ")}</p>
        </div>
      </div>
    );
  }

  const initialValue:
    CreatePublicationInput = {
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

    /*
     * El formulario luego reemplaza
     * action dependiendo de si el
     * usuario guarda borrador o envía
     * a revisión.
     */
    action:
      "DRAFT",
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Volver */}
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
            />{t("Volver al detalle ")}</Link>
        </Button>
      </div>

      {/* Encabezado */}
      <div className="mb-6">
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Publicaciones", href: "/dashboard/publications" }, { label: publication.title || "Detalle", href: `/dashboard/publications/${publication.id}` }, { label: "Editar" }]} />

        <h1 className="!m-0 !text-[26px] !font-semibold !leading-tight !tracking-tight text-[#123a30]">{t("Editar publicación ")}</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Actualiza la información de")}{t(" ")}
          <span className="font-medium text-foreground">
            {publication.title ??
              "esta publicación"}
          </span>
          .
        </p>
      </div>

      <PublicationForm
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
    </div>
  );
}