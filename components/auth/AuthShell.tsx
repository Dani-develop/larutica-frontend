import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { SITE } from "@/modules/landing/constants/site";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <div className="larutica-auth flex h-svh overflow-hidden bg-background">
      <a className="booking-skip" href="#auth-content">Saltar al formulario</a>
      <div className="relative hidden w-[52%] shrink-0 overflow-hidden lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(8,77,58,.15), rgba(8,77,58,.72)), url("/playa.jpg")',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-12 pb-14 text-white">
          <p className="mb-3 text-[10px] font-bold tracking-[0.35em] uppercase opacity-80">
            {eyebrow}
          </p>
          <div className="flex items-center gap-3">
            <BrandMark variant="plain" className="h-12" />
            <div>
              <p className="text-2xl font-semibold tracking-tight">{SITE.name}</p>
              <p className="text-sm text-white/75">{SITE.tagline}</p>
            </div>
          </div>
          <div className="mt-5 h-0.5 w-14 bg-[#d9f5a7]" />
        </div>
      </div>

      <div className="hidden w-px shrink-0 bg-linear-to-b from-transparent via-border to-transparent lg:block" />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav aria-label="Volver al sitio" className="auth-return px-6 pt-6 sm:px-8">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
            <ArrowLeft size={18} aria-hidden="true" /> Volver al inicio
          </Link>
        </nav>
        <div className="mb-2 px-8 pt-10 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="size-9" />
            <span className="text-sm font-semibold">{SITE.name}</span>
          </Link>
        </div>

        <main id="auth-content" tabIndex={-1} className="flex flex-1 items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            </div>
            {children}
          </div>
        </main>

        <p className="py-4 text-center text-xs text-muted-foreground">
          {SITE.name} · Excursiones y transporte en Costa Rica
        </p>
      </div>
    </div>
  );
}
