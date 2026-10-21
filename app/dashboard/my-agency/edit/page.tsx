"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Clock3,
} from "lucide-react";

import AgencyForm from "@/modules/agency/components/agency-form";

import {
  useAgency,
} from "@/modules/agency/hooks/useAgency";

export default function EditAgencyPage() {
  const { t } = usePreferences();
  const router =
    useRouter();

  const {
    agency,
    loading,
    error,
  } =
    useAgency();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="h-4 w-36 animate-pulse rounded bg-[#E8ECEA]" />

        <div className="mt-4 h-8 w-52 animate-pulse rounded bg-[#E2E8E4]" />

        <div className="mt-2 h-3 w-80 max-w-full animate-pulse rounded bg-[#EEF1EF]" />

        <div className="mt-5 space-y-3">
          <div className="h-56 animate-pulse rounded-xl bg-[#F0F3F1]" />

          <div className="h-56 animate-pulse rounded-xl bg-[#F0F3F1]" />

          <div className="h-44 animate-pulse rounded-xl bg-[#F0F3F1]" />
        </div>
      </div>
    );
  }

  if (
    error ||
    !agency
  ) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="!m-0 text-red-800 lr-page-title">{t("No se pudo cargar la agencia ")}</h1>

          <p className="mt-2 text-sm text-red-700">
            {error ??
              "No encontramos una agencia asociada a tu cuenta."}
          </p>

          <Link
            href="/dashboard/my-agency"
            className="mt-4 inline-block text-sm font-medium text-[#075E36] hover:underline"
          >{t("Volver a Mi agencia ")}</Link>
        </div>
      </div>
    );
  }

  if (
    agency.status ===
    "PENDING"
  ) {
    return (
      <BlockedEditState
        icon={
          <Clock3
            size={22}
          />
        }
        title={t("Tu agencia está en revisión")}
        description={t("Mientras administración revisa la información enviada, no puedes modificar el perfil. Cuando finalice la revisión podrás continuar según el resultado.")}
        buttonText="Volver a Mi agencia"
        onBack={() =>
          router.push(
            "/dashboard/my-agency",
          )
        }
      />
    );
  }

  if (
    agency.status ===
    "INACTIVE"
  ) {
    return (
      <BlockedEditState
        icon={
          <Ban
            size={22}
          />
        }
        title={t("La agencia está inactiva")}
        description={t("Una agencia inactiva no puede modificarse desde este formulario.")}
        buttonText="Volver a Mi agencia"
        onBack={() =>
          router.push(
            "/dashboard/my-agency",
          )
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <button
        type="button"
        onClick={() =>
          router.push(
            "/dashboard/my-agency",
          )
        }
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#52615B] transition hover:text-[#075E36]"
      >
        <ArrowLeft
          size={14}
        />{t("Volver a Mi agencia ")}</button>

      <div className="mb-3">
        <h1 className="!m-0 !max-w-none lr-page-title">{t("Editar agencia ")}</h1>

        <p className="mt-1 text-[12px] leading-5 text-[#66706B]">{t("Actualiza la información de tu negocio. ")}</p>
      </div>

      {agency.status ===
        "APPROVED" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#F1D49A] bg-[#FFF9EC] px-4 py-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF1C8] text-[#886617]">
            <AlertTriangle
              size={16}
            />
          </span>

          <div>
            <p className="text-[11px] font-semibold text-[#765B17]">{t("Estás modificando una agencia verificada ")}</p>

            <p className="mt-0.5 text-[10px] leading-4 text-[#8C7743]">{t("Al guardar cambios, la agencia volverá a estado borrador y tendrás que enviarla nuevamente para revisión. ")}</p>
          </div>
        </div>
      )}

      {agency.status ===
        "REJECTED" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#F2CACA] bg-[#FFF4F4] px-4 py-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFE6E6] text-[#A63737]">
            <AlertTriangle
              size={16}
            />
          </span>

          <div>
            <p className="text-[11px] font-semibold text-[#963333]">{t("Tu agencia requiere correcciones ")}</p>

            <p className="mt-0.5 text-[10px] leading-4 text-[#A75A5A]">{t("Revisa y corrige la información necesaria. Luego podrás reenviarla para una nueva revisión. ")}</p>
          </div>
        </div>
      )}

      <AgencyForm
        mode="edit"
        initialAgency={
          agency
        }
        onCancel={() =>
          router.push(
            "/dashboard/my-agency",
          )
        }
      />
    </div>
  );
}

function BlockedEditState({
  icon,
  title,
  description,
  buttonText,
  onBack,
}: {
  icon:
    React.ReactNode;

  title: string;

  description: string;

  buttonText: string;

  onBack: () => void;
}) {
  const { t } = usePreferences();
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="rounded-xl border border-[#DDE2DF] bg-white px-6 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#EAF5ED] text-[#075E36]">
          {icon}
        </div>

        <h1 className="!m-0 !mt-4 lr-page-title">
          {t(title)}
        </h1>

        <p className="mx-auto mt-2 max-w-[540px] text-[11px] leading-5 text-[#66706B]">
          {t(description)}
        </p>

        <button
          type="button"
          onClick={
            onBack
          }
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-[#075E36] px-5 text-[11px] font-semibold text-white transition hover:bg-[#064D2D]"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}