"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  PublicationInput,
  PublicationStatus,
} from "../models/Publication";

type PublicationFormProps = {
  initialValue: PublicationInput;
  submitLabel: string;
  onSubmit: (value: PublicationInput) => void;
  onCancel: () => void;
};

function ListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={value}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...values];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              disabled={values.length <= 1}
              aria-label={`Eliminar ${label.toLowerCase()}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...values, ""])}
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
    </Field>
  );
}

export function PublicationForm({
  initialValue,
  submitLabel,
  onSubmit,
  onCancel,
}: PublicationFormProps) {
  const [value, setValue] = useState<PublicationInput>(initialValue);

  function patch<K extends keyof PublicationInput>(
    key: K,
    next: PublicationInput[K],
  ) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...value,
          title: value.title.trim() || "Publicación sin título",
          excerpt: value.excerpt.trim(),
          body: value.body.trim(),
        });
      }}
    >
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">Portada y resumen</h2>
          <p className="text-sm text-muted-foreground">
            Lo que verá el viajero en listados y resultados.
          </p>
        </div>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="title">Título</FieldLabel>
            <Input
              id="title"
              value={value.title}
              onChange={(event) => patch("title", event.target.value)}
              placeholder="Ej. Caminata al volcán Arenal al amanecer"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="destination">Destino</FieldLabel>
              <select
                id="destination"
                value={value.destination}
                onChange={(event) => patch("destination", event.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option>La Fortuna</option>
                <option>Monteverde</option>
                <option>Guanacaste</option>
                <option>San José</option>
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Estado</FieldLabel>
              <select
                id="status"
                value={value.status}
                onChange={(event) =>
                  patch("status", event.target.value as PublicationStatus)
                }
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="Borrador">Borrador</option>
                <option value="En revisión">En revisión</option>
                <option value="Publicada">Publicada</option>
              </select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="coverUrl">Imagen de portada (URL)</FieldLabel>
            <Input
              id="coverUrl"
              value={value.coverUrl}
              onChange={(event) => patch("coverUrl", event.target.value)}
              placeholder="https://..."
            />
          </Field>

          {value.coverUrl ? (
            <div className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.coverUrl}
                alt="Vista previa de portada"
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}

          <Field>
            <FieldLabel htmlFor="excerpt">Resumen corto</FieldLabel>
            <Textarea
              id="excerpt"
              value={value.excerpt}
              onChange={(event) => patch("excerpt", event.target.value)}
              placeholder="Una o dos frases para la tarjeta de resultados."
              className="min-h-20"
            />
          </Field>
        </FieldGroup>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">Contenido tipo blog</h2>
          <p className="text-sm text-muted-foreground">
            Describe la experiencia como una historia breve para el viajero.
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="body">Narrativa</FieldLabel>
          <Textarea
            id="body"
            value={value.body}
            onChange={(event) => patch("body", event.target.value)}
            placeholder="Cuenta cómo empieza el día, qué se siente en el recorrido y cómo termina..."
            className="min-h-40"
          />
        </Field>

        <ListEditor
          label="Actividades"
          values={value.activities}
          onChange={(activities) => patch("activities", activities)}
          placeholder="Ej. Caminata interpretativa"
        />

        <ListEditor
          label="Qué incluye"
          values={value.includes}
          onChange={(includes) => patch("includes", includes)}
          placeholder="Ej. Guía local"
        />
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">Detalles prácticos</h2>
          <p className="text-sm text-muted-foreground">
            Información clara de duración, precio y cupos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="duration">Duración</FieldLabel>
            <Input
              id="duration"
              value={value.duration}
              onChange={(event) => patch("duration", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="languages">Idiomas</FieldLabel>
            <Input
              id="languages"
              value={value.languages}
              onChange={(event) => patch("languages", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="priceUsd">Precio (USD)</FieldLabel>
            <Input
              id="priceUsd"
              type="number"
              min={0}
              value={value.priceUsd}
              onChange={(event) =>
                patch("priceUsd", Number(event.target.value) || 0)
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="maxGroup">Grupo máximo</FieldLabel>
            <Input
              id="maxGroup"
              type="number"
              min={1}
              value={value.maxGroup}
              onChange={(event) =>
                patch("maxGroup", Number(event.target.value) || 1)
              }
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
