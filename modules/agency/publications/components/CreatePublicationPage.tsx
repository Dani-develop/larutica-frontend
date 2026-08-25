"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { emptyPublicationInput } from "../models/Publication";
import { usePublications } from "../hooks/usePublications";
import { PublicationForm } from "./PublicationForm";

export function CreatePublicationPage() {
  const router = useRouter();
  const { create } = usePublications();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/publications" className="hover:underline">
            Publicaciones
          </Link>
          <span className="text-muted-foreground"> / Nueva</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Nueva publicación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Formulario de ejemplo tipo blog: narrativa, actividades e includes.
        </p>
      </div>

      <PublicationForm
        initialValue={emptyPublicationInput}
        submitLabel="Crear publicación"
        onCancel={() => router.push("/dashboard/publications")}
        onSubmit={(value) => {
          const created = create(value);
          router.push(`/dashboard/publications/${created.id}`);
        }}
      />
    </div>
  );
}
