"use client";

import { useRouter } from "next/navigation";

import AgencyForm from "../../../../modules/agency/components/agency-form";

export default function NewAgencyPage() {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-3">
        <h1 className="!m-0 !max-w-none !text-[26px] !font-bold !leading-8 !tracking-[-0.02em] text-[#0B5433]">
          Registrar mi agencia
        </h1>

        <p className="mt-1 text-[12px] leading-5 text-[#66706B]">
          Completa la información de tu negocio para comenzar a publicar
          experiencias y servicios en LaRutica.
        </p>
      </div>

      <AgencyForm
        onCancel={() =>
          router.push("/dashboard/my-agency")
        }
      />
    </div>
  );
}