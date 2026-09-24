"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Bus,
  Clock3,
  DollarSign,
  ImageIcon,
  Languages,
  MapPin,
  Mountain,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type {
  CreatePublicationInput,
  PublicationServiceType,
} from "../types/publication.types";

type PublicationFormProps = {
  initialValue: CreatePublicationInput;

  onSubmit: (
    value: CreatePublicationInput,
  ) => Promise<void> | void;

  onCancel: () => void;

  draftLabel?: string;

  submitLabel?: string;
};

const LANGUAGES = [
  {
    id: 1,
    name: "Español",
    code: "es",
  },
  {
    id: 2,
    name: "Inglés",
    code: "en",
  },
];

export function PublicationForm({
  initialValue,
  onSubmit,
  onCancel,
  draftLabel = "Guardar borrador",
  submitLabel = "Enviar a revisión",
}: PublicationFormProps) {
  const [
    value,
    setValue,
  ] =
    useState<CreatePublicationInput>(
      initialValue,
    );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function patch<
    K extends keyof CreatePublicationInput,
  >(
    key: K,
    next:
      CreatePublicationInput[K],
  ) {
    setValue(
      (previous) => ({
        ...previous,
        [key]: next,
      }),
    );
  }

  function toggleLanguage(
    languageId: number,
  ) {
    const current =
      value.languageIds ?? [];

    const exists =
      current.includes(
        languageId,
      );

    patch(
      "languageIds",
      exists
        ? current.filter(
            (id) =>
              id !==
              languageId,
          )
        : [
            ...current,
            languageId,
          ],
    );
  }

  async function handleSubmit(
    action:
      | "DRAFT"
      | "SUBMIT",
  ) {
    setError(null);

    if (
      action === "SUBMIT"
    ) {
      const validationError =
        validateForSubmit(
          value,
        );

      if (validationError) {
        setError(
          validationError,
        );

        return;
      }
    }

    setSubmitting(true);

    try {
      await onSubmit({
        ...value,

        title:
          value.title?.trim() ??
          "",

        description:
          value.description?.trim() ??
          "",

        destination:
          value.destination?.trim() ??
          "",

        included:
          value.included?.trim() ??
          "",

        notIncluded:
          value.notIncluded?.trim() ??
          "",

        meetingPoint:
          value.meetingPoint?.trim() ??
          "",

        mainImageUrl:
          value.mainImageUrl?.trim() ??
          "",

        action,
      });
    } catch (submitError) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "No se pudo guardar la publicación.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {/* Tipo de servicio */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Tipo de servicio"
          description="Selecciona qué tipo de experiencia vas a publicar."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ServiceTypeButton
            active={
              value.serviceType ===
              "EXCURSION"
            }
            icon={
              <Mountain
                size={18}
              />
            }
            title="Excursión"
            description="Tours, actividades y experiencias."
            onClick={() =>
              patch(
                "serviceType",
                "EXCURSION",
              )
            }
          />

          <ServiceTypeButton
            active={
              value.serviceType ===
              "TRANSPORT"
            }
            icon={
              <Bus
                size={18}
              />
            }
            title="Transporte"
            description="Traslados y servicios de transporte."
            onClick={() =>
              patch(
                "serviceType",
                "TRANSPORT",
              )
            }
          />
        </div>
      </section>

      {/* Información principal */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Información principal"
          description="Información que verá el viajero al consultar la publicación."
        />

        <div className="mt-5 space-y-4">
          <FormField
            label="Nombre de la publicación"
            required
          >
            <Input
              value={
                value.title ?? ""
              }
              onChange={(
                event,
              ) =>
                patch(
                  "title",
                  event.target
                    .value,
                )
              }
              placeholder="Ej. Excursión al Volcán Arenal"
              maxLength={150}
            />
          </FormField>

          <FormField
            label="Descripción"
            required
          >
            <Textarea
              value={
                value.description ??
                ""
              }
              onChange={(
                event,
              ) =>
                patch(
                  "description",
                  event.target
                    .value,
                )
              }
              placeholder="Describe brevemente la experiencia, recorrido y principales características."
              maxLength={1000}
              className="min-h-24 resize-y"
            />

            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {
                (
                  value.description ??
                  ""
                ).length
              }
              /1000
            </p>
          </FormField>

          <FormField
            label="Destino"
            required
          >
            <div className="relative">
              <MapPin
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                value={
                  value.destination ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  patch(
                    "destination",
                    event.target
                      .value,
                  )
                }
                placeholder="Ej. La Fortuna, Alajuela"
                className="pl-9"
              />
            </div>
          </FormField>
        </div>
      </section>

      {/* Precio, duración y capacidad */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Detalles del servicio"
          description="Define precio, duración y capacidad máxima."
        />

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <FormField
            label="Precio por persona"
            required
          >
            <div className="relative">
              <DollarSign
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                type="number"
                min={0}
                step="0.01"
                value={
                  value.pricePerPerson ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  patch(
                    "pricePerPerson",
                    event.target
                      .value === ""
                      ? null
                      : Number(
                          event
                            .target
                            .value,
                        ),
                  )
                }
                placeholder="0.00"
                className="pl-9"
              />
            </div>

            <p className="mt-1 text-[11px] text-muted-foreground">
              USD
            </p>
          </FormField>

          <FormField
            label="Duración"
            required
          >
            <div className="relative">
              <Clock3
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                type="number"
                min={1}
                step={1}
                value={
                  value.durationMinutes ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  patch(
                    "durationMinutes",
                    event.target
                      .value === ""
                      ? null
                      : Number(
                          event
                            .target
                            .value,
                        ),
                  )
                }
                placeholder="240"
                className="pl-9"
              />
            </div>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Minutos
            </p>
          </FormField>

          <FormField
            label="Capacidad máxima"
            required
          >
            <div className="relative">
              <Users
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                type="number"
                min={1}
                step={1}
                value={
                  value.defaultCapacity ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  patch(
                    "defaultCapacity",
                    event.target
                      .value === ""
                      ? null
                      : Number(
                          event
                            .target
                            .value,
                        ),
                  )
                }
                placeholder="20"
                className="pl-9"
              />
            </div>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Personas
            </p>
          </FormField>
        </div>
      </section>

      {/* Idiomas */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Idiomas"
          description="Selecciona los idiomas disponibles durante el servicio."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {LANGUAGES.map(
            (language) => {
              const selected =
                (
                  value.languageIds ??
                  []
                ).includes(
                  language.id,
                );

              return (
                <button
                  key={
                    language.id
                  }
                  type="button"
                  onClick={() =>
                    toggleLanguage(
                      language.id,
                    )
                  }
                  className={[
                    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition",
                    selected
                      ? "border-[#0d684e] bg-[#edf7f3] text-[#0d684e]"
                      : "border-black/10 bg-white text-foreground hover:bg-muted/50",
                  ].join(
                    " ",
                  )}
                >
                  <Languages
                    size={14}
                  />

                  {
                    language.name
                  }

                  <span className="text-[10px] uppercase opacity-60">
                    {
                      language.code
                    }
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      {/* Incluye */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Detalles de la experiencia"
          description="Aclara qué recibe el viajero y qué debe considerar por separado."
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FormField
            label="Qué incluye"
            required
          >
            <Textarea
              value={
                value.included ??
                ""
              }
              onChange={(
                event,
              ) =>
                patch(
                  "included",
                  event.target
                    .value,
                )
              }
              placeholder="Ej. Guía turístico, entrada al parque y refrigerio."
              className="min-h-28 resize-y"
            />
          </FormField>

          <FormField
            label="Qué no incluye"
            required
          >
            <Textarea
              value={
                value.notIncluded ??
                ""
              }
              onChange={(
                event,
              ) =>
                patch(
                  "notIncluded",
                  event.target
                    .value,
                )
              }
              placeholder="Ej. Alimentación, transporte hasta el punto de encuentro."
              className="min-h-28 resize-y"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField
            label="Punto de encuentro"
            required
          >
            <div className="relative">
              <MapPin
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                value={
                  value.meetingPoint ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  patch(
                    "meetingPoint",
                    event.target
                      .value,
                  )
                }
                placeholder="Ej. Parque Central de La Fortuna"
                className="pl-9"
              />
            </div>
          </FormField>
        </div>
      </section>

      {/* Imagen */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Imagen principal"
          description="De momento utilizaremos una URL. Más adelante podemos conectarlo con Storage."
        />

        <div className="mt-5">
          <FormField
            label="URL de la imagen"
            required
          >
            <div className="relative">
              <ImageIcon
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                type="url"
                value={
                  value.mainImageUrl ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  patch(
                    "mainImageUrl",
                    event.target
                      .value,
                  )
                }
                placeholder="https://..."
                className="pl-9"
              />
            </div>
          </FormField>

          {value.mainImageUrl ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  value.mainImageUrl
                }
                alt="Vista previa de la publicación"
                className="h-56 w-full object-cover"
              />
            </div>
          ) : (
            <div className="mt-4 flex h-36 items-center justify-center rounded-xl border border-dashed border-black/15 bg-muted/30">
              <div className="text-center">
                <ImageIcon
                  size={22}
                  className="mx-auto text-muted-foreground"
                />

                <p className="mt-2 text-xs text-muted-foreground">
                  La vista previa aparecerá aquí.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Acciones */}
      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={
            onCancel
          }
        >
          Cancelar
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() =>
            void handleSubmit(
              "DRAFT",
            )
          }
        >
          {submitting
            ? "Guardando..."
            : draftLabel}
        </Button>

        <Button
          type="button"
          disabled={submitting}
          onClick={() =>
            void handleSubmit(
              "SUBMIT",
            )
          }
          className="bg-[#0d684e] text-white hover:bg-[#0b5943]"
        >
          {submitting
            ? "Procesando..."
            : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function validateForSubmit(
  value: CreatePublicationInput,
): string | null {
  if (!value.serviceType) {
    return "Selecciona el tipo de servicio.";
  }

  if (
    !value.title?.trim()
  ) {
    return "Ingresa el nombre de la publicación.";
  }

  if (
    !value.description?.trim()
  ) {
    return "Ingresa una descripción.";
  }

  if (
    !value.destination?.trim()
  ) {
    return "Ingresa el destino.";
  }

  if (
    value.pricePerPerson ===
      null ||
    value.pricePerPerson ===
      undefined ||
    value.pricePerPerson <= 0
  ) {
    return "Ingresa un precio por persona válido.";
  }

  if (
    value.durationMinutes ===
      null ||
    value.durationMinutes ===
      undefined ||
    value.durationMinutes <= 0
  ) {
    return "Ingresa una duración válida.";
  }

  if (
    !value.languageIds ||
    value.languageIds.length ===
      0
  ) {
    return "Selecciona al menos un idioma.";
  }

  if (
    !value.included?.trim()
  ) {
    return "Indica qué incluye el servicio.";
  }

  if (
    !value.notIncluded?.trim()
  ) {
    return "Indica qué no incluye el servicio.";
  }

  if (
    !value.meetingPoint?.trim()
  ) {
    return "Ingresa el punto de encuentro.";
  }

  if (
    !value.mainImageUrl?.trim()
  ) {
    return "Ingresa una imagen principal.";
  }

  if (
    value.defaultCapacity ===
      null ||
    value.defaultCapacity ===
      undefined ||
    value.defaultCapacity <= 0
  ) {
    return "Ingresa una capacidad máxima válida.";
  }

  return null;
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[#123a30]">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">
        {label}

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </label>

      {children}
    </div>
  );
}

function ServiceTypeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-start gap-3 rounded-xl border p-4 text-left transition",
        active
          ? "border-[#0d684e] bg-[#edf7f3] shadow-sm"
          : "border-black/10 bg-white hover:border-black/20 hover:bg-muted/30",
      ].join(" ")}
    >
      <div
        className={[
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          active
            ? "bg-[#0d684e] text-white"
            : "bg-muted text-muted-foreground",
        ].join(" ")}
      >
        {icon}
      </div>

      <div>
        <p
          className={[
            "text-sm font-semibold",
            active
              ? "text-[#0d684e]"
              : "text-foreground",
          ].join(" ")}
        >
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}