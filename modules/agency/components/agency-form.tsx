"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  AtSign,
  BadgeCheck,
  Bus,
  FileText,
  Flower2,
  Globe2,
  ImageIcon,
  Info,
  Landmark,
  Leaf,
  MessageCircle,
  Mountain,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  UploadCloud,
  Zap,
} from "lucide-react";

import {
  useAgency,
} from "../hooks/useAgency";

import type {
  Agency,
  AgencyFormData,
  BusinessType,
} from "../types/agency.types";

interface AgencyFormProps {
  onCancel: () => void;

  mode?:
    | "create"
    | "edit";

  initialAgency?:
    | Agency
    | null;
}

const initialForm: AgencyFormData = {
  agencyName: "",
  commercialName: "",
  businessType: "",
  description: "",

  email: "",
  phone: "",
  website: "",

  country: "Costa Rica",
  province: "",
  city: "",
  exactAddress: "",

  logoUrl: "",
  coverUrl: "",
  verificationDocumentUrl: "",

  instagramUrl: "",
  facebookUrl: "",
  whatsapp: "",

  categoryIds: [],
  languageIds: [],

  acceptedTerms: false,
};

function agencyToFormData(
  agency: Agency,
): AgencyFormData {
  return {
    agencyName:
      agency.agencyName,

    commercialName:
      agency.commercialName,

    businessType:
      agency.businessType,

    description:
      agency.description ??
      "",

    email:
      agency.email ??
      "",

    phone:
      agency.phone ??
      "",

    website:
      agency.website ??
      "",

    country:
      agency.country ??
      "Costa Rica",

    province:
      agency.province ??
      "",

    city:
      agency.city ??
      "",

    exactAddress:
      agency.exactAddress ??
      "",

    logoUrl:
      agency.logoUrl ??
      "",

    coverUrl:
      agency.coverUrl ??
      "",

    verificationDocumentUrl:
      agency.verificationDocumentUrl ??
      "",

    instagramUrl:
      agency.instagramUrl ??
      "",

    facebookUrl:
      agency.facebookUrl ??
      "",

    whatsapp:
      agency.whatsapp ??
      "",

    categoryIds:
      agency.categories.map(
        (category) =>
          category.id,
      ),

    languageIds:
      agency.languages.map(
        (language) =>
          language.id,
      ),

    acceptedTerms:
      agency.acceptedTerms,
  };
}

const businessTypes: Array<{
  value: BusinessType;
  label: string;
}> = [
  {
    value: "AGENCY",
    label: "Agencia",
  },
  {
    value: "TOUR_OPERATOR",
    label: "Operador turístico",
  },
  {
    value: "TRANSPORT",
    label: "Transporte",
  },
  {
    value: "INDEPENDENT_GUIDE",
    label: "Guía independiente",
  },
];

const categories = [
  {
    id: 1,
    name: "Aventura",
    icon: Mountain,
  },
  {
    id: 2,
    name: "Naturaleza",
    icon: Leaf,
  },
  {
    id: 3,
    name: "Cultura",
    icon: Landmark,
  },
  {
    id: 4,
    name: "Transporte",
    icon: Bus,
  },
  {
    id: 5,
    name: "Playa",
    icon: Sun,
  },
  {
    id: 6,
    name: "Bienestar",
    icon: Flower2,
  },
];

const languages = [
  {
    id: 1,
    name: "Español",
  },
  {
    id: 2,
    name: "Inglés",
  },
];

export default function AgencyForm({
  onCancel,
  mode = "create",
  initialAgency = null,
}: AgencyFormProps) {
  const {
    createAgency,
    updateAgency,
    saving,
    error,
  } =
    useAgency();

  const [
    form,
    setForm,
  ] =
    useState<AgencyFormData>(
      initialAgency
        ? agencyToFormData(
            initialAgency,
          )
        : initialForm,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    languagesOpen,
    setLanguagesOpen,
  ] =
    useState(false);

  const updateField = <
    K extends keyof AgencyFormData,
  >(
    field: K,
    value: AgencyFormData[K],
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        [field]: value,
      }),
    );
  };

  const toggleCategory = (
    id: number,
  ) => {
    setForm(
      (previous) => ({
        ...previous,

        categoryIds:
          previous.categoryIds.includes(
            id,
          )
            ? previous.categoryIds.filter(
                (item) =>
                  item !== id,
              )
            : [
                ...previous.categoryIds,
                id,
              ],
      }),
    );
  };

  const toggleLanguage = (
    id: number,
  ) => {
    setForm(
      (previous) => ({
        ...previous,

        languageIds:
          previous.languageIds.includes(
            id,
          )
            ? previous.languageIds.filter(
                (item) =>
                  item !== id,
              )
            : [
                ...previous.languageIds,
                id,
              ],
      }),
    );
  };

  const saveDraft =
    async () => {
      try {
        setSuccessMessage(
          null,
        );

        const payload = {
          ...form,
          action:
            "DRAFT" as const,
        };

        if (
          mode === "edit"
        ) {
          await updateAgency(
            payload,
          );

          setSuccessMessage(
            "Los cambios se guardaron correctamente.",
          );
        } else {
          await createAgency(
            payload,
          );

          setSuccessMessage(
            "La agencia se guardó como borrador.",
          );
        }
      } catch {
        // useAgency maneja el error.
      }
    };

  const submitAgency =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      try {
        setSuccessMessage(
          null,
        );

        const payload = {
          ...form,
          action:
            "SUBMIT" as const,
        };

        if (
          mode === "edit"
        ) {
          await updateAgency(
            payload,
          );

          setSuccessMessage(
            "La agencia fue actualizada y enviada para revisión.",
          );
        } else {
          await createAgency(
            payload,
          );

          setSuccessMessage(
            "La agencia fue enviada para revisión.",
          );
        }
      } catch {
        // useAgency maneja el error.
      }
    };

  const previewName =
    form.commercialName.trim() ||
    form.agencyName.trim() ||
    "Aventura Verde CR";

  const previewLocation =
    useMemo(() => {
      const location = [
        form.city,
        form.province,
      ]
        .filter(Boolean)
        .join(", ");

      return (
        location ||
        "La Fortuna, Alajuela"
      );
    }, [
      form.city,
      form.province,
    ]);

  const selectedLanguageNames =
    languages
      .filter(
        (language) =>
          form.languageIds.includes(
            language.id,
          ),
      )
      .map(
        (language) =>
          language.name,
      );

  return (
    <form
      onSubmit={
        submitAgency
      }
      className="space-y-3"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3.15fr)_minmax(250px,1fr)]">
        {/* COLUMNA PRINCIPAL */}
        <div className="space-y-3">
          {/* 1. DATOS GENERALES */}
          <SectionCard
            number="1"
            title="Datos generales"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Nombre de la agencia"
                required
              >
                <input
                  value={
                    form.agencyName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "agencyName",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="Ej. Aventura Verde CR"
                />
              </Field>

              <Field
                label="Nombre comercial"
                required
              >
                <input
                  value={
                    form.commercialName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "commercialName",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="Ej. Aventura Verde Costa Rica"
                />
              </Field>
            </div>

            <div className="mt-3">
              <p
                className={
                  labelClass
                }
              >
                Tipo de negocio
                <Required />
              </p>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {businessTypes.map(
                  (type) => {
                    const selected =
                      form.businessType ===
                      type.value;

                    return (
                      <button
                        key={
                          type.value
                        }
                        type="button"
                        onClick={() =>
                          updateField(
                            "businessType",
                            type.value,
                          )
                        }
                        className={[
                          "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-left text-[11px] font-medium transition-colors",

                          selected
                            ? "border-[#0A6A42] bg-[#EFF8F3] text-[#075E36]"
                            : "border-[#DDE2DF] bg-white text-[#252B28] hover:border-[#8AB5A0] hover:bg-[#FAFCFB]",
                        ].join(
                          " ",
                        )}
                      >
                        <span
                          className={[
                            "flex size-3.5 shrink-0 items-center justify-center rounded-full border",

                            selected
                              ? "border-[#08643B]"
                              : "border-[#AAB2AE]",
                          ].join(
                            " ",
                          )}
                        >
                          {selected && (
                            <span className="size-1.5 rounded-full bg-[#08643B]" />
                          )}
                        </span>

                        <span className="truncate">
                          {
                            type.label
                          }
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
              <Field
                label="Descripción"
                required
              >
                <div className="relative">
                  <textarea
                    value={
                      form.description
                    }
                    maxLength={
                      600
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "description",
                        event
                          .target
                          .value,
                      )
                    }
                    className={`${textareaClass} pb-5`}
                    placeholder="Describe tu agencia, tus servicios y lo que la hace especial."
                  />

                  <span className="absolute bottom-1.5 right-2.5 text-[10px] text-[#87908C]">
                    {
                      form
                        .description
                        .length
                    }{" "}
                    / 600
                  </span>
                </div>
              </Field>

              <Field
                label="Idiomas que ofrece"
                required
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setLanguagesOpen(
                        (
                          previous,
                        ) =>
                          !previous,
                      )
                    }
                    className={`${inputClass} flex items-center justify-between text-left`}
                  >
                    <span
                      className={
                        selectedLanguageNames.length
                          ? "truncate text-[#252B28]"
                          : "truncate text-[#8A938E]"
                      }
                    >
                      {selectedLanguageNames.length
                        ? selectedLanguageNames.join(
                            ", ",
                          )
                        : "Selecciona uno o más idiomas"}
                    </span>

                    <span className="ml-2 text-[9px] text-[#66706B]">
                      ▼
                    </span>
                  </button>

                  {languagesOpen && (
                    <div className="absolute left-0 right-0 top-[40px] z-20 rounded-lg border border-[#DDE2DF] bg-white p-1.5 shadow-lg">
                      {languages.map(
                        (
                          language,
                        ) => {
                          const selected =
                            form.languageIds.includes(
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
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-[#252B28] transition hover:bg-[#EFF8F3]"
                            >
                              <span
                                className={[
                                  "flex size-3.5 items-center justify-center rounded border text-[8px]",

                                  selected
                                    ? "border-[#08643B] bg-[#08643B] text-white"
                                    : "border-[#B5BCB8]",
                                ].join(
                                  " ",
                                )}
                              >
                                {selected &&
                                  "✓"}
                              </span>

                              {
                                language.name
                              }
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            <div className="mt-3">
              <p
                className={
                  labelClass
                }
              >
                Categorías de servicio
                <Required />
              </p>

              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                {categories.map(
                  ({
                    id,
                    name,
                    icon: Icon,
                  }) => {
                    const selected =
                      form.categoryIds.includes(
                        id,
                      );

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          toggleCategory(
                            id,
                          )
                        }
                        className={[
                          "flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors",

                          selected
                            ? "border-[#0A6A42] bg-[#EFF8F3] text-[#075E36]"
                            : "border-[#DDE2DF] bg-white text-[#252B28] hover:border-[#8AB5A0] hover:bg-[#FAFCFB]",
                        ].join(
                          " ",
                        )}
                      >
                        <Icon
                          size={
                            13
                          }
                          strokeWidth={
                            1.8
                          }
                          className="shrink-0 text-[#075E36]"
                        />

                        <span className="truncate">
                          {name}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </SectionCard>

          {/* 2. CONTACTO Y UBICACIÓN */}
          <SectionCard
            number="2"
            title="Contacto y ubicación"
          >
            <div className="grid gap-3 lg:grid-cols-3">
              <Field
                label="Correo electrónico"
                required
              >
                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "email",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="ejemplo@aventuraverde.cr"
                />
              </Field>

              <Field
                label="Teléfono"
                required
              >
                <div className="flex h-9 overflow-hidden rounded-lg border border-[#DDE2DF] bg-white transition focus-within:border-[#08643B] focus-within:ring-2 focus-within:ring-[#08643B]/10">
                  <div className="flex items-center gap-1 border-r border-[#DDE2DF] px-2.5 text-[11px] font-medium text-[#252B28]">
                    <span>
                      CR
                    </span>

                    <span className="text-[8px] text-[#66706B]">
                      ▼
                    </span>
                  </div>

                  <input
                    value={
                      form.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "phone",
                        event
                          .target
                          .value,
                      )
                    }
                    className="min-w-0 flex-1 px-3 text-[12px] text-[#252B28] outline-none placeholder:text-[#9AA19D]"
                    placeholder="6000-0000"
                  />
                </div>
              </Field>

              <Field label="Sitio web (opcional)">
                <input
                  value={
                    form.website
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "website",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="https://www.ejemplo.com"
                />
              </Field>

              <Field
                label="País"
                required
              >
                <select
                  value={
                    form.country
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "country",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Costa Rica">
                    Costa Rica
                  </option>
                </select>
              </Field>

              <Field
                label="Provincia / Estado"
                required
              >
                <select
                  value={
                    form.province
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "province",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Selecciona
                  </option>

                  <option value="San José">
                    San José
                  </option>

                  <option value="Alajuela">
                    Alajuela
                  </option>

                  <option value="Cartago">
                    Cartago
                  </option>

                  <option value="Heredia">
                    Heredia
                  </option>

                  <option value="Guanacaste">
                    Guanacaste
                  </option>

                  <option value="Puntarenas">
                    Puntarenas
                  </option>

                  <option value="Limón">
                    Limón
                  </option>
                </select>
              </Field>

              <Field
                label="Ciudad"
                required
              >
                <input
                  value={
                    form.city
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "city",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="La Fortuna"
                />
              </Field>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_1.7fr]">
              <Field
                label="Dirección exacta"
                required
              >
                <input
                  value={
                    form.exactAddress
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "exactAddress",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="Ej. 200 metros norte del parque central"
                />
              </Field>

              <div>
                <p
                  className={
                    labelClass
                  }
                >
                  Redes sociales{" "}
                  <span className="font-normal text-[#66706B]">
                    (opcional)
                  </span>
                </p>

                <div className="grid gap-2 sm:grid-cols-3">
                  <SocialInput
                    icon={
                      <AtSign
                        size={
                          13
                        }
                      />
                    }
                    value={
                      form.instagramUrl
                    }
                    placeholder="@aventuraverdecr"
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "instagramUrl",
                        value,
                      )
                    }
                  />

                  <SocialInput
                    icon={
                      <Globe2
                        size={
                          13
                        }
                      />
                    }
                    value={
                      form.facebookUrl
                    }
                    placeholder="/aventuraverdecr"
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "facebookUrl",
                        value,
                      )
                    }
                  />

                  <SocialInput
                    icon={
                      <MessageCircle
                        size={
                          13
                        }
                      />
                    }
                    value={
                      form.whatsapp
                    }
                    placeholder="+506 6000 0000"
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "whatsapp",
                        value,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 3. IDENTIDAD */}
          <SectionCard
            number="3"
            title="Identidad visual y verificación"
          >
            <div className="grid gap-3 lg:grid-cols-3">
              <UploadBox
                title="Subir logo"
                subtitle="JPG, PNG o SVG. Máx. 2MB"
                value={
                  form.logoUrl
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "logoUrl",
                    value,
                  )
                }
                preview={
                  form.logoUrl ? (
                    <img
                      src={
                        form.logoUrl
                      }
                      alt="Logo"
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#075E36] text-white">
                      <Mountain
                        size={
                          20
                        }
                      />
                    </div>
                  )
                }
                text="Arrastra tu logo aquí"
              />

              <UploadBox
                title="Imagen de portada"
                subtitle="JPG, PNG. Recomendado 1600x600px. Máx. 5MB"
                value={
                  form.coverUrl
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "coverUrl",
                    value,
                  )
                }
                preview={
                  form.coverUrl ? (
                    <img
                      src={
                        form.coverUrl
                      }
                      alt="Portada"
                      className="h-10 w-full rounded-md object-cover"
                    />
                  ) : (
                    <ImageIcon
                      size={
                        25
                      }
                      className="text-[#075E36]"
                    />
                  )
                }
                text="Arrastra una imagen aquí"
              />

              <UploadBox
                title="Documento de verificación"
                info
                subtitle="PDF, JPG o PNG. Máx. 5MB"
                value={
                  form.verificationDocumentUrl
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "verificationDocumentUrl",
                    value,
                  )
                }
                preview={
                  <FileText
                    size={
                      26
                    }
                    className="text-[#66706B]"
                  />
                }
                text="Arrastra tu archivo aquí"
              />
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={
                  form.acceptedTerms
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "acceptedTerms",
                    event
                      .target
                      .checked,
                  )
                }
                className="size-4 accent-[#075E36]"
              />

              <span className="text-[11px] text-[#252B28]">
                Acepto los{" "}
                <button
                  type="button"
                  className="font-medium text-[#075E36] underline underline-offset-2"
                >
                  términos y condiciones
                </button>

                <Required />
              </span>
            </label>
          </SectionCard>
        </div>

        {/* PANEL LATERAL */}
        <aside className="space-y-3 self-start">
          <div className="rounded-xl border border-[#D7E7D9] bg-[#F7FBF8] p-4">
            <h3 className="!m-0 !text-[13px] !font-semibold !leading-5 !tracking-normal text-[#252B28]">
              Información importante
            </h3>

            <div className="mt-4 space-y-4">
              <InfoRow
                icon={
                  <ShieldCheck
                    size={
                      16
                    }
                  />
                }
                text="Tu agencia será revisada por administración antes de activarse."
              />

              <InfoRow
                icon={
                  <BadgeCheck
                    size={
                      16
                    }
                  />
                }
                text="Necesitarás información real y medios de contacto válidos."
              />

              <InfoRow
                icon={
                  <Sparkles
                    size={
                      16
                    }
                  />
                }
                text="Luego podrás crear publicaciones, promociones y gestionar reservas."
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#DDE2DF] bg-white p-3.5">
            <h3 className="!m-0 !mb-3 !text-[13px] !font-semibold !leading-5 !tracking-normal text-[#252B28]">
              Así se verá tu agencia
            </h3>

            <div className="relative">
              <div className="h-28 overflow-hidden rounded-lg bg-[#EEF4EF]">
                {form.coverUrl ? (
                  <img
                    src={
                      form.coverUrl
                    }
                    alt="Portada de la agencia"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon
                      size={
                        28
                      }
                      className="text-[#91A69A]"
                    />
                  </div>
                )}
              </div>

              <div className="absolute -bottom-5 left-3 flex size-11 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-sm">
                {form.logoUrl ? (
                  <img
                    src={
                      form.logoUrl
                    }
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#075E36] text-white">
                    <Mountain
                      size={
                        18
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-7">
              <div className="flex items-center gap-1.5">
                <h4 className="text-[14px] font-bold leading-5 text-[#252B28]">
                  {
                    previewName
                  }
                </h4>

                <BadgeCheck
                  size={
                    14
                  }
                  className="text-[#075E36]"
                />
              </div>

              <p className="mt-0.5 text-[10px] leading-4 text-[#66706B]">
                Agencia de turismo ·{" "}
                {
                  previewLocation
                }
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {form
                  .categoryIds
                  .length >
                0 ? (
                  form.categoryIds
                    .slice(
                      0,
                      3,
                    )
                    .map(
                      (
                        id,
                      ) => {
                        const category =
                          categories.find(
                            (
                              item,
                            ) =>
                              item.id ===
                              id,
                          );

                        return category ? (
                          <span
                            key={
                              category.id
                            }
                            className="rounded bg-[#E7F3E9] px-1.5 py-0.5 text-[9px] font-medium text-[#075E36]"
                          >
                            {
                              category.name
                            }
                          </span>
                        ) : null;
                      },
                    )
                ) : (
                  <>
                    <span className="rounded bg-[#E7F3E9] px-1.5 py-0.5 text-[9px] text-[#075E36]">
                      Aventura
                    </span>

                    <span className="rounded bg-[#E7F3E9] px-1.5 py-0.5 text-[9px] text-[#075E36]">
                      Naturaleza
                    </span>

                    <span className="rounded bg-[#E7F3E9] px-1.5 py-0.5 text-[9px] text-[#075E36]">
                      Transporte
                    </span>
                  </>
                )}
              </div>

              <p className="mt-2.5 text-[10px] leading-4 text-[#66706B]">
                {form.description ||
                  "Creamos experiencias auténticas y sostenibles para que descubras lo mejor de Costa Rica."}
              </p>

              <div className="mt-2.5 rounded-lg border border-[#D7E7D9] bg-[#F7FBF8] p-2.5">
                <div className="grid grid-cols-2 divide-x divide-[#D7E7D9]">
                  <div className="flex items-center gap-1.5 pr-2">
                    <Star
                      size={
                        12
                      }
                      className="text-[#075E36]"
                    />

                    <span className="text-[10px] font-semibold">
                      4.8
                    </span>

                    <span className="text-[9px] text-[#66706B]">
                      (127)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pl-2">
                    <Leaf
                      size={
                        12
                      }
                      className="text-[#075E36]"
                    />

                    <span className="text-[9px] text-[#252B28]">
                      48 experiencias
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5 border-t border-[#D7E7D9] pt-2">
                  <Zap
                    size={
                      12
                    }
                    className="text-[#075E36]"
                  />

                  <span className="text-[9px] text-[#252B28]">
                    Respuesta rápida
                  </span>
                </div>
              </div>

              <p className="mt-2.5 text-[9px] leading-4 text-[#87908C]">
                Este es solo un ejemplo de cómo se mostrará el perfil público
                de tu agencia.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
          {
            successMessage
          }
        </div>
      )}

      {/* ACCIONES */}
      <div className="flex flex-col gap-2.5 border-t border-[#E0E4E1] pt-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={
            onCancel
          }
          disabled={
            saving
          }
          className="h-9 min-w-[140px] rounded-lg border border-[#66706B] bg-white px-5 text-[11px] font-semibold text-[#252B28] transition hover:bg-[#F7F8F7] disabled:opacity-50"
        >
          Cancelar
        </button>

        <div className="ml-auto flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              void saveDraft()
            }
            disabled={
              saving
            }
            className="h-9 min-w-[165px] rounded-lg border border-[#075E36] bg-white px-5 text-[11px] font-semibold text-[#075E36] transition hover:bg-[#EFF8F3] disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : mode ===
                  "edit"
                ? "Guardar cambios"
                : "Guardar borrador"}
          </button>

          <button
            type="submit"
            disabled={
              saving
            }
            className="inline-flex h-9 min-w-[200px] items-center justify-center gap-2 rounded-lg bg-[#075E36] px-5 text-[11px] font-semibold text-white transition hover:bg-[#064D2D] disabled:opacity-50"
          >
            <Send
              size={
                13
              }
            />

            {saving
              ? "Guardando..."
              : "Enviar para revisión"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SectionCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#DDE2DF] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-[#075E36] text-[10px] font-bold text-white">
          {number}
        </span>

        <h2 className="!m-0 !text-[14px] !font-semibold !leading-5 !tracking-normal text-[#0B5433]">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function Field({
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
    <label className="block">
      <span
        className={
          labelClass
        }
      >
        {label}

        {required && (
          <Required />
        )}
      </span>

      {children}
    </label>
  );
}

function Required() {
  return (
    <span className="ml-1 text-[#D94343]">
      *
    </span>
  );
}

function SocialInput({
  icon,
  value,
  placeholder,
  onChange,
}: {
  icon:
    React.ReactNode;

  value: string;

  placeholder: string;

  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <div className="flex h-9 overflow-hidden rounded-lg border border-[#DDE2DF] bg-white transition focus-within:border-[#08643B] focus-within:ring-2 focus-within:ring-[#08643B]/10">
      <span className="flex h-full w-9 shrink-0 items-center justify-center border-r border-[#DDE2DF] text-[#075E36]">
        {icon}
      </span>

      <input
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        placeholder={
          placeholder
        }
        className="min-w-0 flex-1 bg-transparent px-2.5 text-[11px] text-[#252B28] outline-none placeholder:text-[#9AA19D]"
      />
    </div>
  );
}

function UploadBox({
  title,
  subtitle,
  value,
  onChange,
  preview,
  text,
  info = false,
}: {
  title: string;

  subtitle: string;

  value: string;

  onChange: (
    value: string,
  ) => void;

  preview:
    React.ReactNode;

  text: string;

  info?: boolean;
}) {
  return (
    <div>
      <p
        className={`${labelClass} flex items-center gap-1`}
      >
        {title}

        <Required />

        {info && (
          <Info
            size={
              11
            }
            className="text-[#66706B]"
          />
        )}
      </p>

      <div className="relative flex min-h-[104px] flex-col items-center justify-center rounded-lg border border-dashed border-[#C9D0CC] bg-[#FCFDFC] px-3 py-2.5 text-center transition hover:border-[#8AB5A0] hover:bg-[#FAFCFB]">
        <button
          type="button"
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md border border-[#DDE2DF] bg-white text-[#075E36] transition hover:bg-[#EFF8F3]"
        >
          <UploadCloud
            size={
              12
            }
          />
        </button>

        <div className="mb-1.5 flex min-h-9 items-center justify-center">
          {preview}
        </div>

        <p className="text-[10px] font-medium text-[#252B28]">
          {text}
        </p>

        <label className="mt-0.5 cursor-pointer text-[9px] font-semibold text-[#075E36]">
          o selecciona un archivo

          <input
            type="text"
            value={
              value
            }
            onChange={(
              event,
            ) =>
              onChange(
                event
                  .target
                  .value,
              )
            }
            className="sr-only"
          />
        </label>

        <p className="mt-1 text-[8px] leading-3 text-[#87908C]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon:
    React.ReactNode;

  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAF5ED] text-[#075E36]">
        {icon}
      </span>

      <p className="pt-0.5 text-[10px] leading-4 text-[#39423E]">
        {text}
      </p>
    </div>
  );
}

const labelClass =
  "mb-1 block text-[12px] font-semibold leading-4 text-[#252B28]";

const inputClass =
  "h-9 w-full rounded-lg border border-[#DDE2DF] bg-white px-3 text-[12px] text-[#252B28] outline-none transition placeholder:text-[#9AA19D] focus:border-[#08643B] focus:ring-2 focus:ring-[#08643B]/10";

const textareaClass =
  "min-h-[64px] w-full resize-none rounded-lg border border-[#DDE2DF] bg-white px-3 py-2 text-[11px] leading-4 text-[#252B28] outline-none transition placeholder:text-[#9AA19D] focus:border-[#08643B] focus:ring-2 focus:ring-[#08643B]/10";