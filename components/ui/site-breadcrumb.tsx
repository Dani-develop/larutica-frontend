"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { usePreferences } from "@/lib/preferences/Preferences";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export type BreadcrumbEntry = {
  label: string;
  /** Destino real. Se ignora en la última entrada, que es la página actual. */
  href?: string;
  /** Para vistas que viven en estado y no tienen URL propia. */
  onClick?: () => void;
  /** false para contenido de usuario o proveedor (títulos), que nunca se traduce. */
  translate?: boolean;
};

type SiteBreadcrumbProps = {
  items: BreadcrumbEntry[];
  /** Destino de "Inicio". Por defecto la portada pública. */
  homeHref?: string;
  /** Sustituye el enlace de "Inicio" cuando la portada es una vista en estado. */
  onHome?: () => void;
  className?: string;
};

const linkClassName = "inline-flex min-h-9 items-center gap-1.5 rounded-sm hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function SiteBreadcrumb({ items, homeHref = "/", onHome, className }: SiteBreadcrumbProps) {
  const { t } = usePreferences();
  const home = <><Home size={14} aria-hidden="true" />{t("Inicio")}</>;

  return (
    <Breadcrumb aria-label={t("Ruta de navegación")} className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          {onHome ? (
            <BreadcrumbLink asChild className={linkClassName}><button type="button" onClick={onHome}>{home}</button></BreadcrumbLink>
          ) : (
            <BreadcrumbLink asChild className={linkClassName}><Link href={homeHref}>{home}</Link></BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {items.map((item, index) => {
          const text = item.translate === false ? item.label : t(item.label);
          const current = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {current ? (
                  <BreadcrumbPage>{text}</BreadcrumbPage>
                ) : item.onClick ? (
                  <BreadcrumbLink asChild className={linkClassName}><button type="button" onClick={item.onClick}>{text}</button></BreadcrumbLink>
                ) : item.href ? (
                  <BreadcrumbLink asChild className={linkClassName}><Link href={item.href}>{text}</Link></BreadcrumbLink>
                ) : (
                  <span className="text-foreground">{text}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
