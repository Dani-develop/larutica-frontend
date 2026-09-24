import Link from "next/link";
import { SITE } from "@/modules/landing/constants/site";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
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
            <span className="flex size-11 items-center justify-center rounded-[50%_50%_44%_56%] bg-[#d9f5a7] text-sm font-bold text-[#084d3a]">
              LR
            </span>
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
        <div className="mb-2 px-8 pt-10 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-[50%_50%_44%_56%] bg-primary text-xs font-bold text-white">
              LR
            </span>
            <span className="text-sm font-semibold">{SITE.name}</span>
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            </div>
            {children}
          </div>
        </main>

        <p className="py-4 text-center text-xs text-muted-foreground">
          Wireframe · {SITE.name} · 2026
        </p>
      </div>
    </div>
  );
}
