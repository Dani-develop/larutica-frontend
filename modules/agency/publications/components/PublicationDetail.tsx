"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePublications } from "../hooks/usePublications";
import { PublicationStatusBadge } from "./PublicationStatusBadge";

export function PublicationDetail({ id }: { id: string }) {
  const router = useRouter();
  const { getById, remove } = usePublications();
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            <Link href="/dashboard/publications" className="hover:underline">
              Publicaciones
            </Link>
            <span className="text-muted-foreground"> / Detalle</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {publication.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PublicationStatusBadge status={publication.status} />
            <span className="text-sm text-muted-foreground">
              {publication.destination}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/dashboard/publications/${publication.id}/edit`}>
              <Pencil className="size-3.5" />
              Editar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm(`¿Eliminar “${publication.title}”?`)) {
                remove(publication.id);
                router.push("/dashboard/publications");
              }
            }}
          >
            <Trash2 className="size-3.5" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publication.coverUrl}
          alt={publication.title}
          className="h-64 w-full object-cover"
        />
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>{publication.excerpt}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose-sm whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {publication.body}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Actividades</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {publication.activities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold">Qué incluye</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {publication.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Duración</p>
              <p className="font-medium">{publication.duration}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Idiomas</p>
              <p className="font-medium">{publication.languages}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Precio</p>
              <p className="font-medium">${publication.priceUsd}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Grupo máx.</p>
              <p className="font-medium">{publication.maxGroup}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
