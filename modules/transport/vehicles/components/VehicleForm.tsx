"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  VehicleInput,
  VehicleStatus,
  VehicleType,
} from "../models/Vehicle";
import { VEHICLE_TYPES } from "../models/Vehicle";

type VehicleFormProps = {
  initialValue: VehicleInput;
  submitLabel: string;
  onSubmit: (value: VehicleInput) => void;
  onCancel: () => void;
};

const selectClassName =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function VehicleForm({
  initialValue,
  submitLabel,
  onSubmit,
  onCancel,
}: VehicleFormProps) {
  const { t } = usePreferences();
  const [value, setValue] = useState<VehicleInput>(initialValue);

  function patch<K extends keyof VehicleInput>(key: K, next: VehicleInput[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...value,
          name: value.name.trim() || "Vehículo sin nombre",
          plate: value.plate.trim(),
        });
      }}
    >
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">{t("Datos del vehículo")}</h2>
          <p className="text-sm text-muted-foreground">{t("Tipo, capacidad y placa que usarás al publicar rutas. ")}</p>
        </div>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="name">{t("Nombre")}</FieldLabel>
            <Input
              id="name"
              value={value.name}
              onChange={(event) => patch("name", event.target.value)}
              placeholder={t("Ej. Van Nosara")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="type">{t("Tipo")}</FieldLabel>
              <select
                id="type"
                value={value.type}
                onChange={(event) =>
                  patch("type", event.target.value as VehicleType)
                }
                className={selectClassName}
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="status">{t("Estado")}</FieldLabel>
              <select
                id="status"
                value={value.status}
                onChange={(event) =>
                  patch("status", event.target.value as VehicleStatus)
                }
                className={selectClassName}
              >
                <option value="Disponible">{t("Disponible")}</option>
                <option value="En mantenimiento">{t("En mantenimiento")}</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="seats">{t("Asientos")}</FieldLabel>
              <Input
                id="seats"
                type="number"
                min={1}
                value={value.seats}
                onChange={(event) =>
                  patch("seats", Number(event.target.value) || 1)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plate">{t("Placa")}</FieldLabel>
              <Input
                id="plate"
                value={value.plate}
                onChange={(event) => patch("plate", event.target.value)}
                placeholder={t("Ej. TS-2041")}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="photoUrl">{t("Foto (URL)")}</FieldLabel>
            <Input
              id="photoUrl"
              value={value.photoUrl}
              onChange={(event) => patch("photoUrl", event.target.value)}
              placeholder={t("https://...")}
            />
          </Field>

          {value.photoUrl ? (
            <div className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.photoUrl}
                alt={`Vista previa de ${value.name || "vehículo"}`}
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}
        </FieldGroup>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold">{t("Equipamiento")}</h2>
          <p className="text-sm text-muted-foreground">{t("Lo que el viajero verá asociado a este vehículo. ")}</p>
        </div>
        <div className="space-y-2">
          {value.features.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                placeholder={t("Ej. Aire acondicionado")}
                onChange={(event) => {
                  const next = [...value.features];
                  next[index] = event.target.value;
                  patch("features", next);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() =>
                  patch(
                    "features",
                    value.features.filter((_, i) => i !== index),
                  )
                }
                disabled={value.features.length <= 1}
                aria-label={t("Eliminar ítem")}
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
            onClick={() => patch("features", [...value.features, ""])}
          >
            <Plus className="size-4" />{t("Agregar ")}</Button>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>{t("Cancelar ")}</Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
