import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  // "badge": logo blanco sobre el verde de marca. "plain": logo blanco sin fondo,
  // para fondos oscuros o fotos.
  variant?: "badge" | "plain";
};

export function BrandMark({ className, variant = "badge" }: BrandMarkProps) {
  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-blanco.png"
      alt=""
      aria-hidden="true"
      className={variant === "badge" ? "h-[62%] w-auto" : "h-full w-auto"}
    />
  );

  if (variant === "plain") {
    return <span className={cn("flex shrink-0 items-center justify-center", className)}>{logo}</span>;
  }

  return (
    <span
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]",
        className,
      )}
    >
      {logo}
    </span>
  );
}
