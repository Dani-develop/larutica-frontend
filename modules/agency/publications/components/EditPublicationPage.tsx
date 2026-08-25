"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePublications } from "../hooks/usePublications";
import { PublicationForm } from "./PublicationForm";

export function EditPublicationPage({ id }: { id: string }) {
  const router = useRouter();
  const { getById, update } = usePublications();
  const publication = getById(id);

  if (!publication) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold">Publicación no encontrada</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/publications">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...initialValue } =
    publication;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          <Link href="/dashboard/publications" className="hover:underline">
            Publicaciones
          </Link>
          <span className="text-muted-foreground"> / Editar</span>
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Editar publicación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{publication.title}</p>
      </div>

      <PublicationForm
        initialValue={initialValue}
        submitLabel="Guardar cambios"
        onCancel={() => router.push(`/dashboard/publications/${id}`)}
        onSubmit={(value) => {
          update(id, value);
          router.push(`/dashboard/publications/${id}`);
        }}
      />
    </div>
  );
}
