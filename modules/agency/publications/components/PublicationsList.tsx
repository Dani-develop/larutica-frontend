"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

export function PublicationsList() {
  const { publications, remove } = usePublications();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Publicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CRUD de ejemplo para la vista Agencia. Dos publicaciones ya vienen
            creadas.
          </p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto">
          <Link href="/dashboard/publications/new">
            <Plus className="size-4" />
            Nueva publicación
          </Link>
        </Button>
      </div>

      {publications.length === 0 ? (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Sin publicaciones</CardTitle>
            <CardDescription>
              Crea la primera para mostrarla a los viajeros.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {publications.map((publication) => (
            <Card key={publication.id} className="overflow-hidden shadow-xs">
              <div className="relative h-44 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publication.coverUrl}
                  alt={publication.title}
                  className="size-full object-cover"
                />
                <div className="absolute left-3 top-3">
                  <PublicationStatusBadge status={publication.status} />
                </div>
              </div>
              <CardHeader className="space-y-2">
                <CardDescription className="uppercase tracking-wide">
                  {publication.destination}
                </CardDescription>
                <CardTitle className="text-base leading-snug">
                  <Link
                    href={`/dashboard/publications/${publication.id}`}
                    className="hover:underline"
                  >
                    {publication.title}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {publication.excerpt}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="text-sm">
                  <span className="font-semibold">${publication.priceUsd}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {publication.duration}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/publications/${publication.id}`}>
                      Ver
                    </Link>
                  </Button>
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
                      if (
                        window.confirm(
                          `¿Eliminar “${publication.title}”? Esta acción es solo de ejemplo.`,
                        )
                      ) {
                        remove(publication.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
