"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
} from "lucide-react";

import AgencyForm from "@/modules/agency/components/agency-form";

import {
  useAgency,
} from "@/modules/agency/hooks/useAgency";

export default function EditAgencyPage() {
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
          <h1 className="!m-0 !text-lg !font-semibold !tracking-normal text-red-800">
            No se pudo cargar la agencia
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error ??
              "No encontramos una agencia asociada a tu cuenta."}
          </p>

          <Link
            href="/dashboard/my-agency"
            className="mt-4 inline-block text-sm font-medium text-[#075E36] hover:underline"
          >
            Volver a Mi agencia
          </Link>
        </div>
      </div>
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
          size={
            14
          }
        />

        Volver a Mi agencia
      </button>

      <div className="mb-3">
        <h1 className="!m-0 !max-w-none !text-[26px] !font-bold !leading-8 !tracking-[-0.02em] text-[#0B5433]">
          Editar agencia
        </h1>

        <p className="mt-1 text-[12px] leading-5 text-[#66706B]">
          Actualiza la información de tu negocio y guarda los cambios.
        </p>
      </div>

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