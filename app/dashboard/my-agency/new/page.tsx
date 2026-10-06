"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AgencyForm from "@/modules/agency/components/agency-form";

export default function NewAgencyPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={[
        "mx-auto w-full max-w-[1050px] pb-6",
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none",
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-1.5 opacity-0",
      ].join(" ")}
    >
      <header className="mb-4">
        <h1 className="!m-0 !max-w-none !text-[24px] !font-semibold !leading-7 !tracking-[-0.02em] text-[#123A30]">
          Registrar mi agencia
        </h1>

        <p className="mt-1 !text-[12px] leading-5 text-muted-foreground">
          Completa la información de tu negocio para comenzar a publicar
          experiencias y servicios en LaRutica.
        </p>
      </header>

      <AgencyForm
        mode="create"
        onCancel={() => router.push("/dashboard/my-agency")}
      />
    </div>
  );
}
