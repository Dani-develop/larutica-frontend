"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useVehicles } from "@/modules/transport/vehicles/hooks/useVehicles";
import { vehicleLabel } from "@/modules/transport/vehicles/models/Vehicle";
import type { RouteInput, RouteStatus } from "../models/Route";
import { ROUTE_PLACES } from "../models/Route";

type RouteFormProps = {
  initialValue: RouteInput;
  submitLabel: string;
  onSubmit: (value: RouteInput) => void;
  onCancel: () => void;
};

const selectClassName =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function RouteForm({
  initialValue,
  submitLabel,
  onSubmit,
  onCancel,
}: RouteFormProps) {
  const { vehicles } = useVehicles();
  const [value, setValue] = useState<RouteInput>(initialValue);
  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === value.vehicleId) ?? vehicles[0];

  function patch<K extends keyof RouteInput>(key: K, next: RouteInput[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  function applyVehicle(vehicleId: string) {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) {
      patch("vehicleId", vehicleId);
      return;
    }
    setValue((prev) => ({
      ...prev,
      vehicleId: vehicle.id,
      vehicleType: vehicle.type,
      seats: vehicle.seats,
    }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const vehicle =
          vehicles.find((item) => item.id === value.vehicleId) ??
          selectedVehicle;
        onSubmit({
          ...value,
          excerpt: value.excerpt.trim(),
          providerName: value.providerName.trim() || "Transportes Sol",
          vehicleId: vehicle?.id ?? "",
          vehicleType: vehicle?.type ?? value.vehicleType,
          seats: vehicle?.seats ?? value.seats,
        });
      }}
    >
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">Recorrido</h2>
          <p className="text-sm text-muted-foreground">
            Origen, destino y precio que verá el viajero.
          </p>
        </div>

        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="origin">Origen</FieldLabel>
              <select
                id="origin"
                value={value.origin}
                onChange={(event) => patch("origin", event.target.value)}
                className={selectClassName}
              >
                {ROUTE_PLACES.map((place) => (
                  <option key={place}>{place}</option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="destination">Destino</FieldLabel>
              <select
                id="destination"
                value={value.destination}
                onChange={(event) => patch("destination", event.target.value)}
                className={selectClassName}
              >
                {ROUTE_PLACES.map((place) => (
                  <option key={place}>{place}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="status">Estado</FieldLabel>
              <select
                id="status"
                value={value.status}
                onChange={(event) =>
                  patch("status", event.target.value as RouteStatus)
                }
                className={selectClassName}
              >
                <option value="Borrador">Borrador</option>
                <option value="En revisión">En revisión</option>
                <option value="Publicada">Publicada</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="providerName">Proveedor</FieldLabel>
              <Input
                id="providerName"
                value={value.providerName}
                onChange={(event) => patch("providerName", event.target.value)}
                placeholder="Ej. Transportes Sol"
              />
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
                alt={`Vista previa ${value.origin} a ${value.destination}`}
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
              placeholder="Una o dos frases sobre el traslado."
              className="min-h-20"
            />
          </Field>
        </FieldGroup>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">Qué incluye</h2>
          <p className="text-sm text-muted-foreground">
            Equipaje, paradas o servicios del vehículo.
          </p>
        </div>
        <div className="space-y-2">
          {value.includes.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                placeholder="Ej. Recogida en el pueblo"
                onChange={(event) => {
                  const next = [...value.includes];
                  next[index] = event.target.value;
                  patch("includes", next);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() =>
                  patch(
                    "includes",
                    value.includes.filter((_, i) => i !== index),
                  )
                }
                disabled={value.includes.length <= 1}
                aria-label="Eliminar ítem"
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
            onClick={() => patch("includes", [...value.includes, ""])}
          >
            <Plus className="size-4" />
            Agregar
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">Vehículo y tarifa</h2>
          <p className="text-sm text-muted-foreground">
            Elige un vehículo de tu flota. El tipo y los asientos se toman de
            esa ficha.
          </p>
        </div>
        {vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay vehículos.{" "}
            <Link
              href="/dashboard/agencies/new"
              className="font-medium text-primary hover:underline"
            >
              Crea el primero
            </Link>{" "}
            para poder publicarlo en esta ruta.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="vehicleId">Vehículo</FieldLabel>
              <select
                id="vehicleId"
                value={value.vehicleId || selectedVehicle?.id || ""}
                onChange={(event) => applyVehicle(event.target.value)}
                className={selectClassName}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicleLabel(vehicle)}
                    {vehicle.status === "En mantenimiento"
                      ? " (en mantenimiento)"
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="duration">Duración</FieldLabel>
              <Input
                id="duration"
                value={value.duration}
                onChange={(event) => patch("duration", event.target.value)}
                placeholder="Ej. 1 h 30 min"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priceUsd">
                Precio por persona (USD)
              </FieldLabel>
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
            <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2">
              <p className="text-muted-foreground">Tipo y capacidad</p>
              <p className="font-medium">
                {selectedVehicle?.type ?? value.vehicleType} ·{" "}
                {selectedVehicle?.seats ?? value.seats} asientos
                {selectedVehicle?.plate ? ` · ${selectedVehicle.plate}` : ""}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={vehicles.length === 0}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
