"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { usePreferences } from "@/lib/preferences/Preferences";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

type BreadcrumbEntry = { label: string; href?: string };

export function DashboardBreadcrumb({ items, className }: { items: BreadcrumbEntry[]; className?: string }) {
  const { t } = usePreferences();
  const linkClassName = "inline-flex min-h-9 items-center gap-1.5 rounded-sm hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <Breadcrumb aria-label={t("Ruta de navegación")} className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild className={linkClassName}>
            <Link href="/dashboard"><Home size={14} aria-hidden="true" />{t("Inicio")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.href && index < items.length - 1 ? (
                <BreadcrumbLink asChild className={linkClassName}><Link href={item.href}>{t(item.label)}</Link></BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{t(item.label)}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
